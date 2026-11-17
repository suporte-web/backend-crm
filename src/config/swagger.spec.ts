import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AtendimentoSacController } from '../atendimento-sac/atendimento-sac.controller';
import { AtendimentoSacService } from '../atendimento-sac/atendimento-sac.service';
import { UsuarioSacGuard } from '../atendimento-sac/usuario-sac.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { setupSwagger } from './swagger';

describe('Documentação OpenAPI do SAC', () => {
  let app: INestApplication;
  let document: ReturnType<typeof setupSwagger>;

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [AtendimentoSacController],
      providers: [{ provide: AtendimentoSacService, useValue: {} }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(UsuarioSacGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = module.createNestApplication();
    document = setupSwagger(app);
  });

  afterAll(async () => app?.close());

  it('descreve as 19 operações e sua autenticação', () => {
    const operations = Object.values(document.paths).flatMap((path) =>
      Object.entries(path)
        .filter(([method]) => ['get', 'post', 'put'].includes(method))
        .map(([, operation]) => operation),
    );
    expect(operations).toHaveLength(19);
    for (const operation of operations) {
      expect(operation.summary).toBeTruthy();
      expect(operation.tags).toContain('Atendimento SAC');
      expect(operation.security).toEqual([{ bearer: [] }]);
    }
  });

  it('publica os filtros e os campos obrigatórios da classificação', () => {
    const parameters = document.paths['/atendimento-sac'].get!.parameters!;
    expect(parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'status',
          in: 'query',
          required: false,
        }),
        expect.objectContaining({
          name: 'pagina',
          in: 'query',
          required: false,
        }),
      ]),
    );
    const classification = document.components!.schemas!.ClassificarSacDto;
    expect(classification).toEqual(
      expect.objectContaining({
        required: expect.arrayContaining([
          'tipoReclamacao',
          'motivo',
          'area',
          'responsavelAcaoId',
          'prazo',
        ]),
        properties: expect.objectContaining({ documento: expect.any(Object) }),
      }),
    );
    if ('required' in classification)
      expect(classification.required).not.toContain('documento');
  });

  it('documenta upload multipart com arquivo binário e metadados do anexo', () => {
    const body =
      document.paths['/atendimento-sac/{id}/anexos'].post!.requestBody;
    expect(body).toEqual(
      expect.objectContaining({
        content: {
          'multipart/form-data': {
            schema: {
              allOf: [
                { $ref: '#/components/schemas/AnexoSacDto' },
                expect.objectContaining({
                  required: ['arquivo'],
                  properties: {
                    arquivo: expect.objectContaining({
                      type: 'string',
                      format: 'binary',
                    }),
                  },
                }),
              ],
            },
          },
        },
      }),
    );
    expect(document.components!.schemas!.AnexoSacDto).toBeDefined();
  });
});
