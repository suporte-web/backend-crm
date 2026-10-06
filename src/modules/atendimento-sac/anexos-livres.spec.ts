import { validate } from 'class-validator';
import { AnexoSacDto } from './dto/dados-sac.dto';
import { AtendimentoSacService } from './atendimento-sac.service';
import * as arquivos from '../../common/arquivos-relatos';

jest.mock('../../common/arquivos-relatos');
const arquivo = {
  buffer: Buffer.from('%PDF-teste'),
  mimetype: 'application/pdf',
  size: 10,
  originalname: 'teste.pdf',
} as Express.Multer.File;

describe('Anexos livres do SAC', () => {
  let service: AtendimentoSacService;
  let tx: any;
  beforeEach(() => {
    jest.clearAllMocks();
    tx = {
      atendimentoSac: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'sac',
          atendenteId: 'user',
          status: 'CONCLUIDO',
        }),
        update: jest.fn(),
      },
      atendimentoSacTarefa: { findFirst: jest.fn() },
      atendimentoSacAnexo: { create: jest.fn() },
      atendimentoSacHistorico: { create: jest.fn() },
    };
    service = new AtendimentoSacService(
      { $transaction: (fn: any) => fn(tx) } as any,
      {} as any,
      { get: () => '/tmp/anexos' } as any,
    );
    (arquivos.guardarArquivoRelato as jest.Mock).mockResolvedValue({
      id: 'file',
      arquivo: 'file.pdf',
      nome: 'teste.pdf',
      tipo: 'application/pdf',
      tamanho: 10,
      comentario: null,
    });
  });
  it('aceita a categoria geral ANEXOS', async () => {
    const dto = Object.assign(new AnexoSacDto(), { etapa: 'ANEXOS' });
    expect(await validate(dto)).toEqual([]);
  });
  it.each([
    'NOVO',
    'EM_ATENDIMENTO',
    'AGUARDANDO_ACAO',
    'AGUARDANDO_AVALIACAO',
    'CONCLUIDO',
  ])('permite anexar em %s sem procurar tarefa', async (status) => {
    tx.atendimentoSac.findUnique.mockResolvedValue({
      id: 'sac',
      atendenteId: 'user',
      status,
    });
    await expect(
      service.anexar(
        { sub: 'user', role: 'ATENDIMENTO' },
        'sac',
        { etapa: 'ANEXOS' },
        arquivo,
      ),
    ).resolves.toEqual({ sucesso: true });
    expect(tx.atendimentoSacTarefa.findFirst).not.toHaveBeenCalled();
    expect(tx.atendimentoSacAnexo.create).toHaveBeenCalled();
  });
  it('aceita envios sucessivos sem limite de quantidade', async () => {
    for (let i = 0; i < 30; i++)
      await service.anexar(
        { sub: 'user', role: 'ATENDIMENTO' },
        'sac',
        { etapa: 'ANEXOS' },
        arquivo,
      );
    expect(tx.atendimentoSacAnexo.create).toHaveBeenCalledTimes(30);
  });
  it('permite evidência tardia do responsável por ação concluída', async () => {
    tx.atendimentoSacTarefa.findFirst.mockResolvedValue({
      id: 'tarefa',
      responsavelId: 'executor',
      status: 'CONCLUIDA',
    });
    await service.anexar(
      { sub: 'executor', role: 'OPERACAO' },
      'sac',
      { etapa: 'ACAO_CORRETIVA' },
      arquivo,
    );
    expect(tx.atendimentoSacTarefa.findFirst.mock.calls[0][0].where).toEqual({
      atendimentoId: 'sac',
      tipo: 'ACAO_CORRETIVA',
      responsavelId: 'executor',
    });
  });
  it('nega anexos de ação a um usuário sem tarefa atribuída', async () => {
    tx.atendimentoSacTarefa.findFirst.mockResolvedValue(null);
    await expect(
      service.anexar(
        { sub: 'terceiro', role: 'OPERACAO' },
        'sac',
        { etapa: 'ACAO_CORRETIVA' },
        arquivo,
      ),
    ).rejects.toThrow('atribuídas');
  });
  it('vincula evidência RNC ao tipo correto de tarefa', async () => {
    await service.anexar(
      { sub: 'user', role: 'ATENDIMENTO' },
      'sac',
      { etapa: 'RNC' },
      arquivo,
    );
    expect(tx.atendimentoSacTarefa.findFirst.mock.calls[0][0].where.tipo).toBe(
      'REGISTRO_RNC',
    );
  });
  it('mantém a restrição de acesso ao atendimento', async () => {
    await expect(
      service.anexar(
        { sub: 'outro', role: 'ATENDIMENTO' },
        'sac',
        { etapa: 'ANEXOS' },
        arquivo,
      ),
    ).rejects.toThrow('não atribuído');
    expect(arquivos.guardarArquivoRelato).not.toHaveBeenCalled();
  });
});
