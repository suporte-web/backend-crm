import { BadRequestException, Inject, Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CNPJ_HTTP, CNPJ_PROVIDERS, CnpjData, CnpjHttp, CnpjProvider } from './cnpj.types';
import { cnpjValido, normalizarCnpj } from './cnpj.validation';
import { normalizarResposta, providerUrls } from './cnpj.providers';
import { cnpjConfig } from './cnpj.config';

type ProviderState = { failures: number; openUntil: number; probing: boolean; requests: number[]; version: number };
const manual = 'Você pode continuar o cadastro preenchendo os dados manualmente.';

@Injectable()
export class CnpjService {
  private readonly logger = new Logger(CnpjService.name);
  private readonly options: ReturnType<typeof cnpjConfig>;
  private readonly cache = new Map<string, { data: CnpjData; expires: number }>();
  private readonly pending = new Map<string, Promise<CnpjData>>();
  private readonly states = Object.fromEntries(CNPJ_PROVIDERS.map(name => [name,
    { failures: 0, openUntil: 0, probing: false, requests: [], version: 0 } as ProviderState,
  ])) as Record<CnpjProvider, ProviderState>;

  constructor(config: ConfigService, @Inject(CNPJ_HTTP) private readonly http: CnpjHttp) {
    this.options = cnpjConfig(config);
  }

  async consultar(raw: string): Promise<CnpjData> {
    if (!cnpjValido(raw)) throw new BadRequestException({ code: 'CNPJ_INVALID', message: 'CNPJ inválido. Confira os 14 números e os dígitos verificadores.' });
    const cnpj = normalizarCnpj(raw);
    const cached = this.cache.get(cnpj);
    if (cached && cached.expires > Date.now()) return structuredClone(cached.data);
    this.cache.delete(cnpj);
    const existing = this.pending.get(cnpj);
    if (existing) return structuredClone(await existing);
    if (this.pending.size >= this.options.maxConcurrent) throw this.unavailable();
    const request = this.query(cnpj);
    this.pending.set(cnpj, request);
    try { return structuredClone(await request); }
    finally { this.pending.delete(cnpj); }
  }

  private unavailable() {
    return new ServiceUnavailableException({ code: 'CNPJ_UNAVAILABLE', message: `Consulta de CNPJ temporariamente indisponível. ${manual}` });
  }

  private log(provider: CnpjProvider, status: number | null, start: number, reason: string) {
    // Campos fixos: não incluir URL, CNPJ, contato, stack ou corpo externo.
    this.logger.log({ event: 'cnpj_provider', provider, status, durationMs: Math.max(0, Date.now() - start), reason });
  }

  private retryAfter(value: unknown): number {
    if (typeof value !== 'string' && typeof value !== 'number') return 0;
    const seconds = Number(value);
    if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1000;
    const date = Date.parse(String(value));
    return Number.isFinite(date) ? Math.max(0, date - Date.now()) : 0;
  }

  private failure(state: ProviderState, status: number | null, retryAfter = 0) {
    state.version++;
    state.failures++;
    if (status === 429 || state.failures >= this.options.failures) {
      state.openUntil = Math.max(state.openUntil, Date.now() + this.options.cooldown);
    }
    if (retryAfter > 0) state.openUntil = Math.max(state.openUntil, Date.now() + retryAfter);
  }

  private async query(cnpj: string): Promise<CnpjData> {
    let notFound = 0;
    for (const provider of this.options.order) {
      const start = Date.now();
      const state = this.states[provider];
      state.requests = state.requests.filter(time => time > start - 60000);
      if (state.openUntil > start || state.probing || state.requests.length >= this.options.providers[provider].rpm) {
        this.log(provider, null, start, state.probing || state.openUntil > start ? 'circuit_open' : 'local_rate_limit');
        continue;
      }
      const probing = state.openUntil > 0;
      const version = state.version;
      if (probing) state.probing = true;
      state.requests.push(start);
      let status: number | null = null;
      try {
        const result = await this.http(providerUrls[provider] + cnpj, this.options.providers[provider].timeout);
        status = result.status;
        if (status === 404) {
          notFound++;
          if (state.version === version) { state.failures = 0; state.openUntil = 0; }
          this.log(provider, status, start, 'not_found');
          continue;
        }
        if (status !== 200) {
          const retryAfter = this.retryAfter(result.headers['retry-after']);
          this.failure(state, status, retryAfter);
          this.log(provider, status, start, status === 429 ? 'rate_limited' : 'http_error');
          continue;
        }
        const data = normalizarResposta(provider, result.data, cnpj);
        // Um sucesso iniciado antes de um 429 concorrente não pode remover sua pausa.
        if (state.version === version) { state.failures = 0; state.openUntil = 0; }
        this.remember(cnpj, data);
        this.log(provider, status, start, 'success');
        return data;
      } catch (error: unknown) {
        this.failure(state, status);
        const code = (error as { code?: string })?.code;
        const reason = status === 200 ? 'invalid_response' :
          code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ERR_CANCELED' ? 'timeout' : 'network_error';
        this.log(provider, status, start, reason);
      } finally {
        if (probing) state.probing = false;
      }
    }
    if (notFound === this.options.order.length) throw new NotFoundException({ code: 'CNPJ_NOT_FOUND', message: `CNPJ não encontrado nas bases consultadas. ${manual}` });
    throw this.unavailable();
  }

  private remember(cnpj: string, data: CnpjData) {
    const now = Date.now();
    for (const [key, cached] of this.cache) if (cached.expires <= now) this.cache.delete(key);
    if (this.cache.size >= this.options.cacheMax) this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(cnpj, { data, expires: now + this.options.ttl });
  }
}
