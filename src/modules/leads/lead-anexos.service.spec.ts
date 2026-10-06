import { LeadAnexosService } from './lead-anexos.service';
import * as arquivos from '../../common/arquivos-relatos';
import * as fs from 'node:fs/promises';
jest.mock('../../common/arquivos-relatos');
jest.mock('node:fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));
const user = { sub: 'user', role: 'COMERCIAL' } as any;
const file = {
  buffer: Buffer.from('%PDF-teste'),
  mimetype: 'application/pdf',
  size: 10,
  originalname: 'teste.pdf',
} as Express.Multer.File;
describe('Anexos dos Leads', () => {
  let service: LeadAnexosService;
  let prisma: any;
  let leads: any;
  beforeEach(() => {
    jest.clearAllMocks();
    prisma = {
      leadAnexo: {
        create: jest.fn().mockResolvedValue({ id: 'anexo' }),
        findMany: jest
          .fn()
          .mockResolvedValue(Array.from({ length: 30 }, (_, id) => ({ id }))),
        findFirst: jest
          .fn()
          .mockResolvedValue({
            nome: 'teste.pdf',
            tipo: 'application/pdf',
            arquivo: 'arquivo.pdf',
          }),
      },
      leadTimelineEvent: { create: jest.fn() },
      lead: { update: jest.fn() },
    };
    prisma.$transaction = (fn: any) => fn(prisma);
    leads = {
      findOne: jest
        .fn()
        .mockResolvedValue({ id: 'lead', convertidoParaCliente: true }),
    };
    service = new LeadAnexosService(prisma, leads);
    (arquivos.guardarArquivoRelato as jest.Mock).mockResolvedValue({
      id: 'anexo',
      nome: 'teste.pdf',
      arquivo: 'arquivo.pdf',
      tipo: 'application/pdf',
      tamanho: 10,
      comentario: null,
    });
    (arquivos.lerArquivoRelato as jest.Mock).mockResolvedValue(file.buffer);
  });
  it('lista todos os anexos sem corte de quantidade', async () => {
    expect(await service.listar(user, 'lead')).toHaveLength(30);
    expect(prisma.leadAnexo.findMany.mock.calls[0][0]).not.toHaveProperty(
      'take',
    );
  });
  it('permite adicionar 30 anexos, inclusive após conversão', async () => {
    for (let i = 0; i < 30; i++)
      await service.anexar(user, 'lead', file, 'comentário');
    expect(prisma.leadAnexo.create).toHaveBeenCalledTimes(30);
    expect(prisma.leadTimelineEvent.create).toHaveBeenCalledTimes(30);
  });
  it('nega envio antes de armazenar quando usuário não tem acesso', async () => {
    leads.findOne.mockRejectedValue(new Error('Sem acesso'));
    await expect(service.anexar(user, 'lead', file)).rejects.toThrow(
      'Sem acesso',
    );
    expect(arquivos.guardarArquivoRelato).not.toHaveBeenCalled();
  });
  it('restringe o download ao lead informado', async () => {
    const result = await service.baixar(user, 'lead', 'anexo');
    expect(prisma.leadAnexo.findFirst).toHaveBeenCalledWith({
      where: { id: 'anexo', leadId: 'lead' },
    });
    expect(result.buffer).toEqual(file.buffer);
  });
  it('rejeita anexo inexistente ou de outro lead', async () => {
    prisma.leadAnexo.findFirst.mockResolvedValue(null);
    await expect(service.baixar(user, 'lead', 'anexo')).rejects.toThrow(
      'não encontrado',
    );
    expect(arquivos.lerArquivoRelato).not.toHaveBeenCalled();
  });
  it('remove arquivo salvo se a transação falha', async () => {
    prisma.leadAnexo.create.mockRejectedValue(new Error('Banco indisponível'));
    await expect(service.anexar(user, 'lead', file)).rejects.toThrow(
      'Banco indisponível',
    );
    expect(fs.unlink).toHaveBeenCalled();
  });
  it('exige um arquivo', async () => {
    await expect(
      service.anexar(user, 'lead', undefined as any),
    ).rejects.toThrow('Selecione');
  });
});
