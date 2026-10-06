import { HttpService } from '@nestjs/axios';
import { of } from 'rxjs';
import { BadGatewayException, GatewayTimeoutException, INestApplication, NotFoundException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { RastreamentoPublicoController } from './rastreamento-publico.controller';
import { RastreamentoPublicoService } from './rastreamento-publico.service';
import { TrackingsService } from './trackings.service';
import { TrackingQueryType } from './dto/query-tracking.dto';

describe('Rastreamento público', () => {
  const queryTracking = jest.fn();
  const config = { get: jest.fn((chave: string) => chave === 'SSW_TRACKING_PASSWORD' ? 'segredo-ssw' : undefined) };
  const consulta = { cnpj: '02012862003770', tipo: TrackingQueryType.NRO_NF };
  let app: INestApplication;
  let service: RastreamentoPublicoService;
  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      controllers: [RastreamentoPublicoController],
      providers: [RastreamentoPublicoService, { provide: TrackingsService, useValue: { queryTracking } }, { provide: ConfigService, useValue: config }],
    }).compile();
    service = modulo.get(RastreamentoPublicoService);
    app = modulo.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true, forbidNonWhitelisted: true }));
    await app.init();
  });
  afterAll(() => app.close());
  beforeEach(() => queryTracking.mockReset());

  it('reutiliza o service e devolve somente o contrato público, sem JWT', async () => {
    queryTracking.mockResolvedValue({ success: true, token: 'nao-publicar', header: { cidade_origem: 'Curitiba', cidade_destino: 'São Paulo', nro_cte: 123, previsao_entrega: '05/10/2026', destinatario: 'Pessoa privada' }, tracking: { items: { item: [
      { data_hora: '02/10/2026 12:00', ocorrencia: 'Em trânsito', cidade: 'Curitiba', nome_recebedor: 'Nome privado', nro_doc_recebedor: 'documento-privado' },
      { data_hora: '01/10/2026 09:00', ocorrencia: 'Coletada' },
    ] } } });
    const resposta = await request(app.getHttpServer()).get('/api/public/trackings/123?cnpj=02.012.862%2F0037-70').expect(200);
    expect(queryTracking).toHaveBeenCalledWith(expect.objectContaining({ cnpj: consulta.cnpj, tipoConsulta: 'nro_nf', valor: '123', senha: 'segredo-ssw' }));
    expect(resposta.headers['cache-control']).toBe('no-store');
    expect(resposta.body).toMatchObject({ status: 'Em trânsito', origem: 'Curitiba', destino: 'São Paulo', documento: '123', previsaoEntrega: '05/10/2026' });
    expect(resposta.body.eventos[0].ocorrencia).toBe('Coletada');
    expect(JSON.stringify(resposta.body)).not.toMatch(/segredo|nao-publicar|Pessoa privada|Nome privado|documento-privado/);
  });
  it.each(['cnpj=123', 'cnpj=02012862003770&tipo=errado', 'cnpj=02012862003770&senha=segredo', 'cnpj=02012862003770&tipo=chave_nfe'])('rejeita consulta inválida: %s', async query => {
    await request(app.getHttpServer()).get(`/api/public/trackings/123?${query}`).expect(400);
    expect(queryTracking).not.toHaveBeenCalled();
  });
  it('rejeita código malicioso e CNPJ com letras', async () => {
    await request(app.getHttpServer()).get('/api/public/trackings/%3Cscript%3E?cnpj=02012862003770').expect(400);
    await expect(service.consultar('123', { ...consulta, cnpj: 'abc02012862003770' })).rejects.toThrow();
    expect(queryTracking).not.toHaveBeenCalled();
  });
  it('aceita item único e array de tracking e não inventa origem ou destino', async () => {
    for (const tracking of [{ items: { item: { ocorrencia: 'Coletada', data_hora: '2026-10-01 10:00' } } }, [{ ocorrencia: 'Coletada' }]]) {
      queryTracking.mockResolvedValue({ tracking });
      expect(await service.consultar('PED-123', { ...consulta, tipo: TrackingQueryType.PEDIDO })).toMatchObject({ origem: null, destino: null, eventos: [{ ocorrencia: 'Coletada' }] });
    }
  });
  it('trata carga não encontrada sem ecoar erro da fonte', async () => {
    queryTracking.mockResolvedValue({ success: false, message: 'senha=segredo-ssw', tracking: { items: { item: [] } } });
    await expect(service.consultar('123', consulta)).rejects.toBeInstanceOf(NotFoundException);
    const resposta = await request(app.getHttpServer()).get('/api/public/trackings/123?cnpj=02012862003770').expect(404);
    expect(JSON.stringify(resposta.body)).not.toContain('segredo-ssw');
  });
  it('não repassa falhas técnicas nem credenciais da integração', async () => {
    queryTracking.mockRejectedValue(new Error('token=segredo-ssw'));
    await expect(service.consultar('123', consulta)).rejects.toBeInstanceOf(BadGatewayException);
    const resposta = await request(app.getHttpServer()).get('/api/public/trackings/123?cnpj=02012862003770').expect(502);
    expect(JSON.stringify(resposta.body)).not.toContain('segredo-ssw');
  });
  it('reutiliza também o parser XML existente com dados da SSW', async () => {
    const post = jest.fn(() => of({ data: '<tracking><success>true</success><header><cidade_origem>Curitiba</cidade_origem><cidade_destino>São Paulo</cidade_destino></header><items><item><data_hora>02/10/2026 10:00</data_hora><ocorrencia>Em trânsito</ocorrencia><cidade>Curitiba</cidade><nome_recebedor>privado</nome_recebedor></item></items></tracking>' }));
    const integracao = new TrackingsService({ post } as unknown as HttpService);
    const publico = new RastreamentoPublicoService(integracao, new ConfigService());
    const resposta = await publico.consultar('123', consulta);
    expect(post).toHaveBeenCalledTimes(1);
    expect(resposta).toMatchObject({ status: 'Em trânsito', origem: 'Curitiba', destino: 'São Paulo' });
    expect(JSON.stringify(resposta)).not.toContain('privado');
  });
  it('preserva timeout como 504 com mensagem pública', async () => {
    queryTracking.mockRejectedValue(new GatewayTimeoutException('segredo-ssw'));
    const resposta = await request(app.getHttpServer()).get('/api/public/trackings/123?cnpj=02012862003770').expect(504);
    expect(JSON.stringify(resposta.body)).not.toContain('segredo-ssw');
  });
});
