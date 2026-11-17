import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { VisitasService } from './visitas.service';

// Banco em memória só no teste; serviço real exerce regras e escreve snapshots.
function ambiente(status = 'AGUARDANDO_REALIZACAO') {
  let visita: any = {
    id: 'v1',
    numero: 1,
    protocolo: 'VIS-000001',
    clienteNome: 'Cliente',
    responsavelId: 'ana',
    status,
    dataPrevista: new Date('2026-10-10T12:00:00Z'),
    cliente: { companyName: 'Cliente' },
    participantes: [],
    historico: [],
    sac: null,
  };
  const registros: Record<string, any[]> = {
    visitaHistorico: [],
    visitaReagendamento: [],
    visitaRealizacao: [],
    visitaValidacao: [],
    visitaParticipante: [],
  };
  const tx: any = {
    client: { findUnique: async () => { throw new Error('Não consultar cadastro de clientes'); }, findUniqueOrThrow: async () => { throw new Error('Não consultar cadastro de clientes'); } },
    visitaCliente: {
      create: async ({ data }: any) => { visita = { ...visita, ...data }; return visita; },
      findUniqueOrThrow: async () => ({ ...visita }),
      findUnique: async () => ({ ...visita }),
      update: async ({ data }: any) => {
        visita = { ...visita, ...data };
        return { ...visita };
      },
    },
    user: {
      findUnique: async () => ({
        id: 'ana',
        isActive: true,
        role: 'ATENDIMENTO',
        roles: [],
      }),
    },
  };
  for (const key of Object.keys(registros))
    tx[key] = {
      count: async () => registros[key].length,
      findMany: async () => registros[key],
      create: async ({ data }: any) => {
        registros[key].push({ ...data });
        return data;
      },
      createMany: async ({ data }: any) => {
        registros[key].push(...data);
        return { count: data.length };
      },
    };
  const prisma: any = {
    ...tx,
    $transaction: async (run: any) => {
      const original = structuredClone(visita),
        copia = structuredClone(registros);
      try {
        return await run(tx);
      } catch (e) {
        visita = original;
        for (const key of Object.keys(registros)) registros[key] = copia[key];
        throw e;
      }
    },
  };
  const sac: any = {
    criarDaVisita: async () => ({ id: 's1', protocolo: 'SAC-2026-000001' }),
  };
  return {
    service: new VisitasService(prisma, sac, new ConfigService()),
    registros,
    visita: () => visita,
    sac,
  };
}
const ana = { sub: 'ana', role: 'ATENDIMENTO' };
const gestor = { sub: 'gestor', role: 'GESTAO' };
const realizacao = {
  dataRealizada: '2026-10-10T15:00:00Z',
  relato: 'Visita realizada com sucesso.',
  pessoaAtendeu: 'Cliente',
  teveCusto: false,
};
const avaliacao = {
  atingiuObjetivo: true,
  sentimentoCliente: 'Cliente satisfeito.',
  possuiMelhoria: false,
  classificacao: 'BOA' as const,
  gerarSac: false,
};
describe('Fluxo de visitas', () => {
  it('cria cliente livre sem consultar ou cadastrar na tela Clientes', async () => {
    const a = ambiente('AGENDADA');
    await a.service.criar(gestor, {
      clienteNome: 'Empresa sem cadastro',
      cnpj: '12.345.678/0001-90',
      responsavelId: 'ana',
      localVisita: 'Endereço informado',
      tipoVisita: 'Relacionamento',
      dataPrevista: '2026-10-20T12:00:00Z',
    } as any);
    expect(a.visita().clienteNome).toBe('Empresa sem cadastro');
    expect(a.visita().cnpj).toBe('12.345.678/0001-90');
    expect(a.visita().clienteId).toBeUndefined();
  });
  it('edita nome e limpa CNPJ sem consultar o cadastro de clientes', async () => {
    const a = ambiente('AGENDADA');
    await a.service.atualizar(gestor, 'v1', { clienteNome: 'Outro cliente', cnpj: '' } as any);
    expect(a.visita().clienteNome).toBe('Outro cliente');
    expect(a.visita().cnpj).toBeNull();
  });

  beforeEach(() =>
    jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-10-15T12:00:00Z')),
  );
  afterEach(() => jest.restoreAllMocks());
  it('realiza, valida e conclui preservando autor e relato histórico', async () => {
    const a = ambiente();
    await a.service.realizar(ana, 'v1', realizacao);
    expect(a.visita().status).toBe('AGUARDANDO_VALIDACAO');
    expect(a.registros.visitaRealizacao[0].dados.relato).toBe(
      realizacao.relato,
    );
    await a.service.validar(gestor, 'v1', { decisao: 'APROVAR' });
    expect(a.visita().status).toBe('POS_VISITA');
    await a.service.posVisita(ana, 'v1', avaliacao);
    expect(a.visita().status).toBe('CONCLUIDA');
    expect(
      a.registros.visitaHistorico.every(
        (h) => h.usuarioId && h.statusAnterior && h.statusNovo,
      ),
    ).toBe(true);
  });
  it('guarda todos os reagendamentos e datas anteriores', async () => {
    const a = ambiente();
    await a.service.reagendar(ana, 'v1', {
      novaData: '2026-10-11T12:00:00Z',
      motivo: 'Cliente indisponível',
    });
    await a.service.reagendar(ana, 'v1', {
      novaData: '2026-10-12T12:00:00Z',
      motivo: 'Novo ajuste do cliente',
    });
    expect(a.registros.visitaReagendamento).toHaveLength(2);
    expect(a.registros.visitaReagendamento[0].dataAnterior.toISOString()).toBe(
      '2026-10-10T12:00:00.000Z',
    );
    expect(a.registros.visitaReagendamento[1].dataAnterior.toISOString()).toBe(
      '2026-10-11T12:00:00.000Z',
    );
  });
  it('atendente não pode validar nem acessar visita alheia', async () => {
    const a = ambiente('AGUARDANDO_VALIDACAO');
    await expect(
      a.service.validar(ana, 'v1', { decisao: 'APROVAR' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      a.service.realizar(
        { sub: 'outra', role: 'ATENDIMENTO' },
        'v1',
        realizacao,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
  it('exige custo e impede pular etapas', async () => {
    const a = ambiente();
    await expect(
      a.service.realizar(ana, 'v1', { ...realizacao, teveCusto: true }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      a.service.posVisita(ana, 'v1', avaliacao),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('exige motivo e preserva versões ao devolver para ajuste', async () => {
    const a = ambiente();
    await a.service.realizar(ana, 'v1', realizacao);
    await expect(
      a.service.validar(gestor, 'v1', { decisao: 'AJUSTAR' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await a.service.validar(gestor, 'v1', {
      decisao: 'AJUSTAR',
      observacao: 'Detalhar oportunidades.',
    });
    await a.service.realizar(ana, 'v1', {
      ...realizacao,
      relato: 'Relato corrigido.',
    });
    expect(a.registros.visitaRealizacao).toHaveLength(2);
    expect(a.registros.visitaRealizacao[0].dados.relato).toBe(
      realizacao.relato,
    );
  });
  it('gera SAC uma vez e impede finalizar enquanto o SAC estiver pendente', async () => {
    const a = ambiente('POS_VISITA');
    await a.service.posVisita(ana, 'v1', {
      ...avaliacao,
      gerarSac: true,
      tipoReclamacao: 'Qualidade',
      relatoSac: 'Problema identificado.',
    });
    expect(a.visita().sacId).toBe('s1');
    expect(a.visita().status).toBe('ATENDIMENTO_SAC');
    await expect(
      a.service.posVisita(ana, 'v1', { ...avaliacao, gerarSac: true }),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(a.service.concluir(ana, 'v1')).rejects.toBeInstanceOf(
      ConflictException,
    );
  });
  it('data não aceita volta à validação sem gerar SAC', async () => {
    const a = ambiente('POS_VISITA');
    a.registros.visitaReagendamento.push({ motivo: 'Anterior' });
    await a.service.posVisita(ana, 'v1', {
      ...avaliacao,
      novaDataAceita: false,
      ajustesNecessarios: 'Cliente solicitou outra data',
    } as any);
    expect(a.visita().status).toBe('AGUARDANDO_VALIDACAO');
    expect(a.visita().sacId).toBeUndefined();
    expect(a.registros.visitaHistorico[0].observacao).toBe(
      'Cliente solicitou outra data',
    );
  });
  it('limpar campos opcionais cria uma nova versão sem conservar texto antigo', async () => {
    const a = ambiente();
    await a.service.realizar(ana, 'v1', {
      ...realizacao,
      insights: 'Insight anterior',
      emailPessoaAtendeu: 'antigo@example.com',
    });
    await a.service.validar(gestor, 'v1', {
      decisao: 'AJUSTAR',
      observacao: 'Revisar contato.',
    });
    await a.service.realizar(ana, 'v1', realizacao);
    expect(a.visita().insights).toBeNull();
    expect(a.visita().emailPessoaAtendeu).toBeNull();
    expect(a.registros.visitaRealizacao[0].dados.insights).toBe(
      'Insight anterior',
    );
  });
  it('salva dados e novos participantes juntos na edição', async () => {
    const a = ambiente('AGENDADA');
    await a.service.atualizar(gestor, 'v1', {
      localVisita: 'Novo local',
      participantes: [{ nome: 'Maria', email: 'maria@example.com' }],
    });
    expect(a.visita().localVisita).toBe('Novo local');
    expect(a.registros.visitaParticipante[0].email).toBe('maria@example.com');
  });
  it('participante duplicado não deixa edição parcialmente salva', async () => {
    const a = ambiente('AGENDADA');
    a.registros.visitaParticipante.push({
      nome: 'Maria',
      email: 'maria@example.com',
    });
    await expect(
      a.service.atualizar(gestor, 'v1', {
        localVisita: 'Novo local',
        participantes: [{ nome: 'Maria', email: 'maria@example.com' }],
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(a.visita().localVisita).toBeUndefined();
    expect(a.registros.visitaParticipante).toHaveLength(1);
    expect(a.registros.visitaHistorico).toHaveLength(0);
  });
  it('reverte avaliação se criação do SAC falha', async () => {
    const a = ambiente('POS_VISITA');
    a.sac.criarDaVisita = async () => {
      throw new Error('SAC indisponível');
    };
    await expect(
      a.service.posVisita(ana, 'v1', {
        ...avaliacao,
        gerarSac: true,
        tipoReclamacao: 'Qualidade',
        relatoSac: 'Problema identificado.',
      }),
    ).rejects.toThrow('SAC indisponível');
    expect(a.visita().status).toBe('POS_VISITA');
    expect(a.visita().sacId).toBeUndefined();
    expect(a.registros.visitaHistorico).toHaveLength(0);
  });
});
