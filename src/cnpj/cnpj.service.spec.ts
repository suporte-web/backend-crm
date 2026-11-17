import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CnpjService } from './cnpj.service';

const cnpj = '00000000000191';
const outro = '33683111000280';
const receita = (id = cnpj) => ({ cnpj: id, razao_social: 'EMPRESA TESTE', nome_fantasia: '',
  cnae_fiscal: 6422100, cnae_fiscal_descricao: 'Bancos', municipio: 'BRASILIA', uf: 'DF',
  opcao_pelo_simples: false });
const response = (status: number, data: unknown = null, headers = {}) => ({ status, data, headers });
describe('Consulta resiliente de CNPJ', () => {
  let http: jest.Mock;
  let service: CnpjService;
  const criar = (env: Record<string, string> = {}) => new CnpjService(new ConfigService(env), http);
  beforeEach(() => {
    jest.useFakeTimers({ now: 1700000000000 });
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
    http = jest.fn(); service = criar();
  });
  afterEach(() => { jest.useRealTimers(); jest.restoreAllMocks(); });
  it('encerra a sequência na primeira resposta válida e normaliza', async () => {
    http.mockResolvedValue(response(200, receita()));
    expect(await service.consultar('00.000.000/0001-91')).toMatchObject({
      cnpj, legalName: 'EMPRESA TESTE', cnae: '6422100', provider: 'minhareceita',
    });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('faz fallback para OpenCNPJ usando o envelope real', async () => {
    http.mockResolvedValueOnce(response(503)).mockResolvedValueOnce(response(200, {
      success: true, data: { cnpj, razaoSocial: 'EMPRESA TESTE', opcaoSimples: 'N',
        cnaes: [{ cnae: '6422100', descricao: 'Bancos' }], telefone: '(61) 1234-5678' },
    }));
    expect(await service.consultar(cnpj)).toMatchObject({ provider: 'opencnpj', cnae: '6422100', simpleNational: false });
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('usa BrasilAPI quando os dois primeiros falham', async () => {
    http.mockResolvedValueOnce(response(500)).mockResolvedValueOnce(response(502))
      .mockResolvedValueOnce(response(200, receita()));
    expect((await service.consultar(cnpj)).provider).toBe('brasilapi');
    expect(http).toHaveBeenCalledTimes(3);
  });
  it('todas indisponíveis retornam 503 com código próprio, sem tentativas infinitas', async () => {
    http.mockResolvedValue(response(503));
    await expect(service.consultar(cnpj)).rejects.toMatchObject({ status: 503,
      response: expect.objectContaining({ code: 'CNPJ_UNAVAILABLE' }) });
    expect(http).toHaveBeenCalledTimes(3);
  });
  it.each(['12345678901234', '11111111111111', '00000000000000', '123', 'abc00000000000191'])('rejeita CNPJ inválido: %s', async value => {
    await expect(service.consultar(value)).rejects.toMatchObject({ status: 400 });
    expect(http).not.toHaveBeenCalled();
  });
  it('429 pula provedor e respeita Retry-After em segundos em outras consultas', async () => {
    service = criar({ CNPJ_PROVIDERS: 'opencnpj,minhareceita' });
    http.mockResolvedValueOnce(response(429, null, { 'retry-after': '120' }))
      .mockResolvedValue(response(200, receita()));
    await service.consultar(cnpj);
    http.mockResolvedValue(response(200, receita(outro)));
    await service.consultar(outro);
    expect(http.mock.calls.map(call => call[0])).toEqual([
      `https://kitana.opencnpj.com/cnpj/${cnpj}`, `https://minhareceita.org/${cnpj}`, `https://minhareceita.org/${outro}`,
    ]);
  });
  it('timeout usa o próximo provedor e respeita timeout individual configurado', async () => {
    service = criar({ CNPJ_MINHARECEITA_TIMEOUT_MS: '1250' });
    http.mockRejectedValueOnce({ code: 'ECONNABORTED' })
      .mockResolvedValueOnce(response(200, { success: true, data: { cnpj, razaoSocial: 'Empresa' } }));
    expect((await service.consultar(cnpj)).provider).toBe('opencnpj');
    expect(http.mock.calls[0][1]).toBe(1250);
  });
  it('cache válido evita chamadas; expiração permite nova consulta', async () => {
    service = criar({ CNPJ_CACHE_TTL_MS: '1000' });
    http.mockResolvedValue(response(200, receita()));
    await service.consultar(cnpj); await service.consultar(cnpj);
    expect(http).toHaveBeenCalledTimes(1);
    jest.setSystemTime(Date.now() + 1001);
    await service.consultar(cnpj);
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('requisições simultâneas do mesmo CNPJ compartilham uma chamada', async () => {
    let resolver!: (value: unknown) => void;
    http.mockImplementation(() => new Promise(resolve => { resolver = resolve; }));
    const consultas = [service.consultar(cnpj), service.consultar('00.000.000/0001-91')];
    resolver(response(200, receita()));
    expect(await Promise.all(consultas)).toHaveLength(2);
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('404 não abre circuito nem impede tentativa nas outras bases; só ausência em todas retorna 404', async () => {
    http.mockResolvedValue(response(404));
    await expect(service.consultar(cnpj)).rejects.toMatchObject({ status: 404 });
    await expect(service.consultar(cnpj)).rejects.toMatchObject({ status: 404 });
    expect(http).toHaveBeenCalledTimes(6);
  });
  it('404 misturado com infraestrutura indisponível retorna 503', async () => {
    http.mockResolvedValueOnce(response(404)).mockResolvedValue(response(503));
    await expect(service.consultar(cnpj)).rejects.toMatchObject({ status: 503 });
  });
  it('não aceita identidade divergente ou corpo de sucesso inválido', async () => {
    http.mockResolvedValueOnce(response(200, receita(outro)))
      .mockResolvedValueOnce(response(200, { success: false, data: null }))
      .mockResolvedValueOnce(response(200, receita()));
    expect((await service.consultar(cnpj)).provider).toBe('brasilapi');
  });
  it('abre circuito e permite apenas uma sondagem após cooldown', async () => {
    service = criar({ CNPJ_PROVIDERS: 'minhareceita', CNPJ_CIRCUIT_FAILURE_THRESHOLD: '1', CNPJ_CIRCUIT_COOLDOWN_MS: '1000' });
    http.mockResolvedValueOnce(response(500));
    await expect(service.consultar(cnpj)).rejects.toMatchObject({ status: 503 });
    await expect(service.consultar(outro)).rejects.toMatchObject({ status: 503 });
    expect(http).toHaveBeenCalledTimes(1);
    jest.setSystemTime(Date.now() + 1001);
    let resolver!: (value: unknown) => void;
    http.mockImplementation(() => new Promise(resolve => { resolver = resolve; }));
    const probe = service.consultar(cnpj);
    await expect(service.consultar(outro)).rejects.toMatchObject({ status: 503 });
    resolver(response(200, receita()));
    await expect(probe).resolves.toMatchObject({ cnpj });
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('respeita janela local do provedor sem fila ou espera em loop', async () => {
    service = criar({ CNPJ_PROVIDERS: 'opencnpj', CNPJ_OPENCNPJ_REQUESTS_PER_MINUTE: '1' });
    http.mockResolvedValue(response(200, { success: true, data: { cnpj, razaoSocial: 'Empresa' } }));
    await service.consultar(cnpj);
    await expect(service.consultar(outro)).rejects.toMatchObject({ status: 503 });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('logs não contêm CNPJ, URL, resposta nem contato', async () => {
    http.mockResolvedValue(response(200, { ...receita(), email: 'privado@example.test' }));
    await service.consultar(cnpj);
    const logs = JSON.stringify((Logger.prototype.log as jest.Mock).mock.calls);
    expect(logs).toContain('minhareceita');
    expect(logs).not.toContain(cnpj); expect(logs).not.toContain('privado@example.test');
  });
  it('sucesso concorrente não cancela Retry-After imposto por outra requisição', async () => {
    service = criar({ CNPJ_PROVIDERS: 'minhareceita' });
    let success!: (value: unknown) => void;
    http.mockImplementationOnce(() => new Promise(resolve => { success = resolve; }))
      .mockResolvedValueOnce(response(429, null, { 'retry-after': '120' }));
    const first = service.consultar(cnpj);
    await expect(service.consultar(outro)).rejects.toMatchObject({ status: 503 });
    success(response(200, receita())); await first;
    await expect(service.consultar(outro)).rejects.toMatchObject({ status: 503 });
    expect(http).toHaveBeenCalledTimes(2);
  });
  it('respeita Retry-After no formato de data HTTP', async () => {
    service = criar({ CNPJ_PROVIDERS: 'minhareceita', CNPJ_CIRCUIT_COOLDOWN_MS: '1000' });
    http.mockResolvedValueOnce(response(503, null, { 'retry-after': new Date(Date.now() + 120000).toUTCString() }));
    await expect(service.consultar(cnpj)).rejects.toMatchObject({ status: 503 });
    jest.setSystemTime(Date.now() + 2000);
    await expect(service.consultar(outro)).rejects.toMatchObject({ status: 503 });
    expect(http).toHaveBeenCalledTimes(1);
  });
  it('limita o cache e não permite que consumidores alterem o valor armazenado', async () => {
    service = criar({ CNPJ_CACHE_MAX_ENTRIES: '1' });
    http.mockResolvedValueOnce(response(200, receita())).mockResolvedValueOnce(response(200, receita(outro)))
      .mockResolvedValueOnce(response(200, receita()));
    const first = await service.consultar(cnpj); first.address.city = 'Alterado';
    expect((await service.consultar(cnpj)).address.city).toBe('BRASILIA');
    await service.consultar(outro); await service.consultar(cnpj);
    expect(http).toHaveBeenCalledTimes(3);
  });
  it('valida ordem configurada e não permite exceder os 300/min publicados pela OpenCNPJ', () => {
    expect(() => criar({ CNPJ_PROVIDERS: 'desconhecido' })).toThrow('CNPJ_PROVIDERS');
    expect(() => criar({ CNPJ_PROVIDERS: 'opencnpj,opencnpj' })).toThrow('CNPJ_PROVIDERS');
    expect(() => criar({ CNPJ_OPENCNPJ_REQUESTS_PER_MINUTE: '301' })).toThrow('CNPJ_OPENCNPJ_REQUESTS_PER_MINUTE');
  });
});
