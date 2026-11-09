import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { ClientsService } from './clients.service';
import { AuthUser } from '../auth/types/auth-user.type';

describe('Dados do cadastro nas oportunidades', () => {
  const consultora: AuthUser = {
    sub: 'c1',
    role: UserRole.CONSULTORA,
    email: 'c@example.test',
  };
  let service: ClientsService;
  let permitido: boolean;
  let dono: string;
  let arquivos: Array<Record<string, any>>;
  beforeEach(() => {
    permitido = true;
    dono = 'c1';
    arquivos = [];
    const prisma = {
      roleScreenPermission: {
        findUnique: async () => ({ isEnabled: permitido }),
      },
      client: {
        findUnique: async () => ({
          id: 'cliente',
          internalOwnerId: dono,
          companyName: 'Empresa',
          user: null,
          quotes: [],
          opportunities: [],
          timelineEvents: [],
          documents: arquivos,
          contacts: [],
        }),
      },
      clientDocument: {
        create: async ({ data }: any) => {
          const row = { id: 'doc', ...data };
          arquivos.push(row);
          return row;
        },
        findFirst: async () => ({
          id: 'doc',
          category: 'CONTRATO',
          fileName: 'contrato.pdf',
        }),
      },
      timelineEvent: { create: async () => {} },
    };
    service = Reflect.construct(ClientsService, [prisma, {}, {}, {}]);
  });

  const detalhe = (service: ClientsService, user: AuthUser) =>
    (
      service as ClientsService & {
        getOpportunityDetail(user: AuthUser, id: string): Promise<any>;
      }
    ).getOpportunityDetail(user, 'cliente');

  const planilha = (size: number) => ({
    filename: 'teste.xlsm', originalname: 'proposta.xlsm',
    mimetype: 'application/vnd.ms-excel.sheet.macroEnabled.12', size,
  });

  it.each([11 * 1024, 10 * 1024 * 1024 + 1, 20 * 1024 * 1024])(
    'aceita XLSM com %s bytes até o limite de 20 MB', async size => {
      await service.createDocuments(consultora, 'cliente', [planilha(size)], '', 'OPORTUNIDADE_PROPOSTA');
      expect(arquivos[0]).toMatchObject({ originalName: 'proposta.xlsm', size });
    },
  );

  it('rejeita todo o lote antes de salvar quando um arquivo excede 20 MB', async () => {
    await expect(service.createDocuments(consultora, 'cliente',
      [planilha(1024), planilha(20 * 1024 * 1024 + 1)], '', 'OPORTUNIDADE_PROPOSTA',
    )).rejects.toMatchObject({ status: 413, message: expect.stringContaining('20 MB') });
    expect(arquivos).toEqual([]);
  });

  it('carrega detalhes de oportunidades do cadastro próprio', async () => {
    expect((await detalhe(service, consultora)).client.companyName).toBe(
      'Empresa',
    );
  });
  it('nega acesso direto a detalhes de cadastro de outra consultora', async () => {
    dono = 'c2';
    await expect(detalhe(service, consultora)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('revogar permissão bloqueia também os detalhes por URL direta', async () => {
    permitido = false;
    await expect(detalhe(service, consultora)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('Comercial lê informações de cadastro de qualquer consultora', async () => {
    dono = 'c2';
    expect(
      (await detalhe(service, { ...consultora, role: UserRole.COMERCIAL }))
        .client.companyName,
    ).toBe('Empresa');
  });
  it('Consultora anexa documentos de proposta ao próprio cadastro', async () => {
    const documento = await service.createDocuments(
      consultora,
      'cliente',
      [
        {
          filename: 'teste.pdf',
          originalname: 'proposta.pdf',
          mimetype: 'application/pdf',
          size: 10,
        },
      ],
      'oportunidade:op',
      'OPORTUNIDADE_PROPOSTA',
    );
    expect(documento).toEqual(
      expect.objectContaining({ clientId: 'cliente', uploadedById: 'c1' }),
    );
  });
  it.each(['outro dono', 'sem permissão', 'outra categoria'])(
    'bloqueia anexos: %s',
    async (caso) => {
      if (caso === 'outro dono') dono = 'c2';
      if (caso === 'sem permissão') permitido = false;
      await expect(
        service.createDocuments(
          consultora,
          'cliente',
          [
            {
              filename: 'teste.pdf',
              originalname: 'x.pdf',
              mimetype: 'application/pdf',
              size: 10,
            },
          ],
          '',
          caso === 'outra categoria' ? 'CONTRATO' : 'OPORTUNIDADE_PROPOSTA',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(arquivos).toEqual([]);
    },
  );
  it('não permite à Consultora baixar ou excluir documentos de outras categorias', async () => {
    await expect(
      service.getDocumentDownload(consultora, 'cliente', 'doc'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.deleteDocument(consultora, 'cliente', 'doc', {
        justification: 'teste',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
