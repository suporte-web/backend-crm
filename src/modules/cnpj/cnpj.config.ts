import { ConfigService } from '@nestjs/config';
import { CNPJ_PROVIDERS, CnpjProvider } from './cnpj.types';

export function cnpjConfig(config: ConfigService) {
  const integer = (key: string, fallback: number, max: number) => {
    const raw = config.get<string | number>(key);
    const value = raw === undefined || raw === '' ? fallback : Number(raw);
    if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(`Configuração inválida: ${key}`);
    return value;
  };
  const order = String(config.get('CNPJ_PROVIDERS') ?? CNPJ_PROVIDERS.join(',')).split(',').map(name => name.trim().toLowerCase());
  if (!order.length || order.some(name => !CNPJ_PROVIDERS.includes(name as CnpjProvider)) || new Set(order).size !== order.length) {
    throw new Error('CNPJ_PROVIDERS deve conter provedores conhecidos, sem repetições.');
  }
  const timeout = integer('CNPJ_TIMEOUT_MS', 4000, 30000);
  return {
    order: order as CnpjProvider[],
    ttl: integer('CNPJ_CACHE_TTL_MS', 21600000, 86400000),
    cacheMax: integer('CNPJ_CACHE_MAX_ENTRIES', 1000, 10000),
    maxConcurrent: integer('CNPJ_MAX_CONCURRENT_LOOKUPS', 20, 100),
    failures: integer('CNPJ_CIRCUIT_FAILURE_THRESHOLD', 3, 20),
    cooldown: integer('CNPJ_CIRCUIT_COOLDOWN_MS', 60000, 3600000),
    providers: Object.fromEntries(CNPJ_PROVIDERS.map(name => [name, {
      timeout: integer(`CNPJ_${name.toUpperCase()}_TIMEOUT_MS`, timeout, 30000),
      // OpenCNPJ publica 300/min/IP; os outros dois recebem um teto local conservador.
      rpm: integer(`CNPJ_${name.toUpperCase()}_REQUESTS_PER_MINUTE`, name === 'opencnpj' ? 300 : 60, name === 'opencnpj' ? 300 : 600),
    }])) as Record<CnpjProvider, { timeout: number; rpm: number }>,
  };
}
