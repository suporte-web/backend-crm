import { hasAnyRole } from '../../common/user-roles';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AtendimentoSac,
  Prisma,
  StatusAtendimentoSac,
  StatusTarefaSac,
  TipoTarefaSac,
  UserRole,
} from '@prisma/client';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  guardarArquivoRelato,
  lerArquivoRelato,
  validarArquivoRelato,
} from '../../common/arquivos-relatos';
import {
  AnexoSacDto,
  AvaliarSacDto,
  ClassificarSacDto,
  DirecionarSacDto,
  FiltroSacDto,
  ObservacaoSacDto,
  PlanoAcaoSacDto,
  RncSacDto,
} from './dto/dados-sac.dto';

export type UsuarioSac = { sub: string; role: string; roles?: string[] };
type Tx = Prisma.TransactionClient;
const gestores = ['ADMIN', 'GESTAO', 'LIDER_ATENDIMENTO'];
const pessoa = { id: true, name: true, role: true, roles: true } as const;
const relacoes = {
  atendente: { select: pessoa },
  responsavelAcao: { select: pessoa },
  concluidoPor: { select: pessoa },
};
const json = (valor: unknown) =>
  JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;

@Injectable()
export class AtendimentoSacService {
  private readonly logger = new Logger(AtendimentoSacService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificacoes: NotificationsService,
    private readonly config: ConfigService,
  ) {}
  private gestor(u: UsuarioSac) {
    return hasAnyRole(u, gestores);
  }
  private verificarPerfil(u: UsuarioSac) {
    if (!this.gestor(u) && !hasAnyRole(u, ['ATENDIMENTO']))
      throw new ForbiddenException('Acesso restrito à equipe de atendimento.');
  }
  private verificarAtendente(u: UsuarioSac, a: AtendimentoSac) {
    if (
      !this.gestor(u) &&
      !(hasAnyRole(u, ['ATENDIMENTO']) && a.atendenteId === u.sub)
    )
      throw new ForbiddenException('Atendimento não atribuído a você.');
  }
  private async registro(tx: Tx, id: string) {
    const a = await tx.atendimentoSac.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Atendimento não encontrado.');
    return a;
  }
  private exigirStatus(a: AtendimentoSac, permitidos: StatusAtendimentoSac[]) {
    if (!permitidos.includes(a.status))
      throw new ConflictException(
        'Esta etapa não está disponível no status atual. Atualize o atendimento.',
      );
  }
  private async evento(
    tx: Tx,
    a: AtendimentoSac,
    u: UsuarioSac | null,
    tipo: string,
    descricao: string,
    extra: {
      statusNovo?: StatusAtendimentoSac;
      tarefaId?: string;
      dados?: unknown;
    } = {},
  ) {
    await tx.atendimentoSacHistorico.create({
      data: {
        atendimentoId: a.id,
        usuarioId: u?.sub,
        tipo,
        descricao,
        statusAnterior: a.status,
        statusNovo: extra.statusNovo ?? a.status,
        tarefaId: extra.tarefaId,
        dados: extra.dados === undefined ? undefined : json(extra.dados),
      },
    });
  }
  private async mudar(
    tx: Tx,
    a: AtendimentoSac,
    u: UsuarioSac,
    status: StatusAtendimentoSac,
    tipo: string,
    descricao: string,
    dados: Prisma.AtendimentoSacUncheckedUpdateInput = {},
  ) {
    await tx.atendimentoSac.update({
      where: { id: a.id },
      data: { ...dados, status },
    });
    await this.evento(tx, a, u, tipo, descricao, { statusNovo: status });
    a.status = status;
  }
  private async tarefa(
    tx: Tx,
    a: AtendimentoSac,
    u: UsuarioSac | null,
    tipo: TipoTarefaSac,
    titulo: string,
    responsavelId?: string | null,
    observacao?: string,
  ) {
    const t = await tx.atendimentoSacTarefa.create({
      data: {
        atendimentoId: a.id,
        tipo,
        titulo,
        responsavelId,
        criadorId: u?.sub,
        perfilResponsavel:
          tipo === 'TRIAGEM' ? UserRole.LIDER_ATENDIMENTO : undefined,
        prazo: a.prazo,
        observacao,
      },
    });
    await this.evento(tx, a, u, 'TAREFA_CRIADA', titulo, { tarefaId: t.id });
    return t;
  }
  private async iniciarTarefas(
    tx: Tx,
    a: AtendimentoSac,
    u: UsuarioSac,
    tipos: TipoTarefaSac[],
  ) {
    const tarefas = await tx.atendimentoSacTarefa.findMany({
      where: { atendimentoId: a.id, tipo: { in: tipos }, status: 'PENDENTE' },
    });
    for (const t of tarefas) {
      await tx.atendimentoSacTarefa.update({
        where: { id: t.id },
        data: { status: 'EM_ANDAMENTO', iniciadoEm: new Date() },
      });
      await this.evento(
        tx,
        a,
        u,
        'TAREFA_INICIADA',
        `Tarefa iniciada: ${t.titulo}`,
        { tarefaId: t.id },
      );
    }
  }

  private async finalizarTarefas(
    tx: Tx,
    a: AtendimentoSac,
    tipos: TipoTarefaSac[],
    u: UsuarioSac,
    status: 'CONCLUIDA' | 'CANCELADA' = 'CONCLUIDA',
  ) {
    const tarefas = await tx.atendimentoSacTarefa.findMany({
      where: {
        atendimentoId: a.id,
        tipo: { in: tipos },
        status: { in: ['PENDENTE', 'EM_ANDAMENTO'] },
      },
    });
    for (const t of tarefas) {
      await tx.atendimentoSacTarefa.update({
        where: { id: t.id },
        data: { status, concluidoEm: new Date() },
      });
      await this.evento(
        tx,
        a,
        u,
        `TAREFA_${status}`,
        `${t.titulo}: ${status === 'CONCLUIDA' ? 'concluída' : 'cancelada'}`,
        { tarefaId: t.id },
      );
    }
  }
  private async transacao<T>(operacao: (tx: Tx) => Promise<T>) {
    // A fila por atendimento e a leitura de autorização são serializadas no banco.
    for (let tentativa = 0; tentativa < 3; tentativa++) {
      try {
        return await this.prisma.$transaction(operacao, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 15000,
        });
      } catch (e) {
        if (
          !(e instanceof Prisma.PrismaClientKnownRequestError) ||
          e.code !== 'P2034' ||
          tentativa === 2
        )
          throw e;
      }
    }
    throw new ConflictException('Atualize e tente novamente.');
  }
  private async notificar(
    a: AtendimentoSac,
    u: UsuarioSac | null,
    destinatarios: string[],
    mensagem: string,
  ) {
    await this.notificacoes
      .notifyUsers(destinatarios, {
        title: `${a.protocolo}: Atendimento SAC`,
        message: mensagem,
        link: `/atendimento/${a.id}`,
        actorId: u?.sub,
      })
      .catch(() =>
        this.logger.warn('Não foi possível registrar uma notificação do SAC.'),
      );
  }
  async receberTicketTransacional(
    tx: Tx,
    ticketId: string,
    usuario: UsuarioSac | null = null,
  ) {
    const atual = await tx.atendimentoSac.findUnique({
      where: { ticketOrigemId: ticketId },
    });
    if (atual) return atual;
    const ticket = await tx.ticket.findUnique({ where: { id: ticketId } });
    const p = ticket?.formPayload as Record<string, unknown> | null;
    if (!ticket || p?.canal !== 'RECLAMACOES_ELOGIOS')
      throw new BadRequestException('Origem inválida para Atendimento SAC.');
    const original = {
      nome: ticket.nomeSolicitante,
      email: ticket.emailSolicitante,
      telefone: ticket.telefoneSolicitante,
      ...p,
      enviadoEm: ticket.createdAt.toISOString(),
      clientId: ticket.clientId,
      leadId: ticket.leadId,
    };
    const registro = await tx.atendimentoSac.create({
      data: {
        ticketOrigemId: ticketId,
        relatoOriginal: json(original),
        tipo: String(p.tipoRegistro || 'RECLAMACAO'),
        nome: ticket.nomeSolicitante || 'Solicitante',
        email: ticket.emailSolicitante,
        telefone: ticket.telefoneSolicitante,
        empresa: typeof p.empresa === 'string' ? p.empresa : null,
        cidade: typeof p.cidade === 'string' ? p.cidade : null,
        estado: typeof p.estado === 'string' ? p.estado : null,
      },
    });
    const atendimento = await tx.atendimentoSac.update({
      where: { id: registro.id },
      data: {
        protocolo: `SAC-${ticket.createdAt.getFullYear()}-${String(registro.numero).padStart(6, '0')}`,
      },
    });
    await this.evento(
      tx,
      atendimento,
      usuario,
      ticket.origem === 'VISITA' ? 'RECEBIDO_VISITA' : 'RECEBIDO_SITE',
      ticket.origem === 'VISITA'
        ? 'Atendimento gerado por visita.'
        : 'Atendimento recebido pelo site.',
    );
    await this.evento(
      tx,
      atendimento,
      usuario,
      'PROTOCOLO_CRIADO',
      `Protocolo ${atendimento.protocolo} criado.`,
    );
    const anexos = Array.isArray(p.anexos)
      ? (p.anexos as Array<Record<string, unknown>>)
      : [];
    for (const anexo of anexos) {
      if (typeof anexo.id !== 'string' || typeof anexo.arquivo !== 'string')
        continue;
      await tx.atendimentoSacAnexo.create({
        data: {
          id: anexo.id,
          atendimentoId: atendimento.id,
          nome: String(anexo.nome),
          arquivo: anexo.arquivo,
          tipo: String(anexo.tipo),
          tamanho: Number(anexo.tamanho),
          comentario:
            typeof anexo.comentario === 'string' ? anexo.comentario : null,
          etapa: 'SITE',
          criadoEm: ticket.createdAt,
        },
      });
      await this.evento(
        tx,
        atendimento,
        usuario,
        'ANEXO_ADICIONADO',
        `Anexo recebido pelo site: ${anexo.nome}`,
      );
    }
    await this.tarefa(
      tx,
      atendimento,
      usuario,
      'TRIAGEM',
      'Direcionar atendimento para um atendente',
    );
    return atendimento;
  }
  async receberTicket(ticketId: string, notificar = true) {
    const existente = await this.prisma.atendimentoSac.findUnique({
      where: { ticketOrigemId: ticketId },
    });
    if (existente) return { sucesso: true, protocolo: existente.protocolo };
    let a: AtendimentoSac;
    try {
      a = await this.transacao(async (tx) => {
        return this.receberTicketTransacional(tx, ticketId);
      });
    } catch (e) {
      // A origem possui chave única também entre processos; um reenvio recupera o SAC gravado.
      const gravado = await this.prisma.atendimentoSac.findUnique({
        where: { ticketOrigemId: ticketId },
      });
      if (!gravado) throw e;
      return { sucesso: true, protocolo: gravado.protocolo };
    }
    if (notificar) {
      const ids = await this.notificacoes.getUserIdsByRoles([
        UserRole.ADMIN,
        UserRole.GESTAO,
        UserRole.LIDER_ATENDIMENTO,
      ]);
      await this.notificar(
        a,
        null,
        ids,
        'Novo atendimento recebido pelo Canal do Cliente.',
      );
    }
    return { sucesso: true, protocolo: a.protocolo };
  }
  async criarDaVisita(
    tx: Tx,
    u: UsuarioSac,
    d: {
      visitaId: string;
      protocoloVisita: string;
      cnpj?: string | null;
      responsavelId: string;
      nome: string;
      email?: string;
      telefone?: string;
      empresa?: string;
      cidade?: string;
      estado?: string;
      tipoReclamacao: string;
      relato: string;
    },
  ) {
    const ticket = await tx.ticket.create({
      data: {
        origem: 'VISITA',
        assignedToId: d.responsavelId,
        requesterId: u.sub,
        subject: 'Atendimento decorrente da visita ' + d.protocoloVisita,
        description: d.relato,
        mensagem: d.relato,
        internalOnly: true,
        type: 'SUPORTE',
        nomeSolicitante: d.nome,
        emailSolicitante: d.email,
        telefoneSolicitante: d.telefone,
        formPayload: json({
          ...d,
          canal: 'RECLAMACOES_ELOGIOS',
          origem: 'VISITA',
          tipoRegistro: 'RECLAMACAO',
          relato: d.relato,
          documento: d.cnpj,
        }),
      },
    });
    const atendimento = await this.receberTicketTransacional(tx, ticket.id, u);
    await this.finalizarTarefas(tx, atendimento, ['TRIAGEM'], u);
    await this.tarefa(
      tx,
      atendimento,
      u,
      'ATENDIMENTO',
      'Realizar atendimento decorrente da visita',
      d.responsavelId,
    );
    await this.mudar(
      tx,
      atendimento,
      u,
      'ATRIBUIDO',
      'DIRECIONADO',
      'Atendimento atribuído ao responsável da visita',
      {
        atendenteId: d.responsavelId,
        documento: d.cnpj,
        tipoReclamacao: d.tipoReclamacao,
      },
    );
    return atendimento;
  }
  async listar(u: UsuarioSac, q: FiltroSacDto) {
    this.verificarPerfil(u);
    const fim = q.fim ? new Date(q.fim) : undefined;
    if (fim && /^\d{4}-\d{2}-\d{2}$/.test(q.fim!))
      fim.setUTCHours(23, 59, 59, 999);
    if (q.inicio && fim && new Date(q.inicio) > fim)
      throw new BadRequestException('Período inválido.');
    const where: Prisma.AtendimentoSacWhereInput = {
      protocolo: q.protocolo
        ? { contains: q.protocolo.trim(), mode: 'insensitive' }
        : undefined,
      tipo: q.tipo,
      status: q.status,
      atendenteId: this.gestor(u) ? q.atendenteId : u.sub,
      responsavelAcaoId: q.responsavelAcaoId,
      area: q.area ? { contains: q.area, mode: 'insensitive' } : undefined,
      criadoEm:
        q.inicio || fim
          ? { gte: q.inicio ? new Date(q.inicio) : undefined, lte: fim }
          : undefined,
    };
    const pagina = Math.max(1, Number(q.pagina || 1));
    const [itens, total] = await Promise.all([
      this.prisma.atendimentoSac.findMany({
        where,
        include: relacoes,
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * 30,
        take: 30,
      }),
      this.prisma.atendimentoSac.count({ where }),
    ]);
    return {
      itens: itens.map(({ relatoOriginal, ...item }) => item),
      total,
      pagina,
      porPagina: 30,
    };
  }
  async participantes(u: UsuarioSac) {
    this.verificarPerfil(u);
    return this.prisma.user.findMany({
      where: { isActive: true },
      select: pessoa,
      orderBy: { name: 'asc' },
    });
  }
  async detalhe(u: UsuarioSac, id: string) {
    const a = await this.prisma.atendimentoSac.findUnique({
      where: { id },
      include: {
        ...relacoes,
        visita: { select: { id: true, protocolo: true } },
        historico: {
          include: { usuario: { select: pessoa } },
          orderBy: { criadoEm: 'asc' },
        },
        tarefas: {
          include: {
            responsavel: { select: pessoa },
            criador: { select: pessoa },
          },
          orderBy: { criadoEm: 'asc' },
        },
        anexos: {
          select: {
            id: true,
            nome: true,
            tipo: true,
            tamanho: true,
            comentario: true,
            etapa: true,
            criadoEm: true,
            usuario: { select: pessoa },
            tarefaId: true,
          },
          orderBy: { criadoEm: 'asc' },
        },
      },
    });
    if (!a) throw new NotFoundException('Atendimento não encontrado.');
    this.verificarAtendente(u, a);
    // O snapshot não expõe caminhos de armazenamento nem identificadores de integração.
    const p = a.relatoOriginal as Record<string, unknown>;
    const { assinaturaRelato, identificadorRelato, anexos, ...original } = p;
    return { ...a, relatoOriginal: original };
  }
  async historico(u: UsuarioSac, id: string) {
    return (await this.detalhe(u, id)).historico;
  }
  async tarefas(u: UsuarioSac, id: string) {
    return (await this.detalhe(u, id)).tarefas;
  }
  async direcionar(u: UsuarioSac, id: string, d: DirecionarSacDto) {
    if (!this.gestor(u))
      throw new ForbiddenException(
        'Somente o líder pode direcionar ou reatribuir.',
      );
    const resultado = await this.transacao(async (tx) => {
      const a = await this.registro(tx, id);
      if (a.status === 'CONCLUIDO')
        throw new ConflictException(
          'Reabra o atendimento antes de direcionar.',
        );
      const destino = await tx.user.findFirst({
        where: {
          id: d.atendenteId,
          OR: [
            { role: UserRole.ATENDIMENTO },
            { roles: { has: UserRole.ATENDIMENTO } },
          ],
          isActive: true,
        },
        select: pessoa,
      });
      if (!destino)
        throw new BadRequestException(
          'Selecione um atendente ativo com perfil ATENDIMENTO.',
        );
      const anterior = a.atendenteId;
      await this.finalizarTarefas(
        tx,
        a,
        [
          'TRIAGEM',
          'ATENDIMENTO',
          'CLASSIFICACAO',
          'AVALIACAO_SOLUCAO',
          'REGISTRO_RNC',
        ],
        u,
        'CANCELADA',
      );
      // Reatribuir durante a ação preserva a etapa e a tarefa da ação corretiva.
      const status = ['NOVO', 'ATRIBUIDO', 'REABERTO'].includes(a.status)
        ? 'ATRIBUIDO'
        : a.status;
      await this.mudar(
        tx,
        a,
        u,
        status,
        anterior ? 'REATRIBUIDO' : 'DIRECIONADO',
        `Atendimento direcionado para ${destino.name}`,
        { atendenteId: d.atendenteId },
      );
      await this.evento(
        tx,
        a,
        u,
        'RESPONSAVEL_ATENDIMENTO',
        'Responsável pelo atendimento atualizado.',
        {
          dados: {
            anteriorId: anterior,
            novoId: d.atendenteId,
            observacao: d.observacao,
          },
        },
      );
      await this.tarefa(
        tx,
        a,
        u,
        a.status === 'AGUARDANDO_AVALIACAO'
          ? 'AVALIACAO_SOLUCAO'
          : 'ATENDIMENTO',
        'Atender e acompanhar a ocorrência',
        d.atendenteId,
        d.observacao,
      );
      return await tx.atendimentoSac.findUniqueOrThrow({ where: { id } });
    });
    await this.notificar(
      resultado,
      u,
      [d.atendenteId],
      'Atendimento direcionado para você.',
    );
    return { sucesso: true };
  }
  async iniciar(u: UsuarioSac, id: string) {
    await this.transacao(async (tx) => {
      const a = await this.registro(tx, id);
      this.verificarAtendente(u, a);
      this.exigirStatus(a, ['ATRIBUIDO', 'REABERTO']);
      if (!a.atendenteId)
        throw new ConflictException(
          'Direcione para um atendente antes de iniciar.',
        );
      await this.mudar(
        tx,
        a,
        u,
        'EM_ATENDIMENTO',
        'ATENDIMENTO_INICIADO',
        'Atendimento iniciado.',
      );
      await this.iniciarTarefas(tx, a, u, ['ATENDIMENTO']);
      await this.tarefa(
        tx,
        a,
        u,
        'CLASSIFICACAO',
        'Classificar a ocorrência',
        a.atendenteId,
      );
    });
    return { sucesso: true };
  }
  async classificar(u: UsuarioSac, id: string, d: ClassificarSacDto) {
    const a = await this.transacao(async (tx) => {
      const a = await this.registro(tx, id);
      this.verificarAtendente(u, a);
      this.exigirStatus(a, [
        'EM_ATENDIMENTO',
        'CLASSIFICADO',
        'AGUARDANDO_ACAO',
      ]);
      const responsavel = await tx.user.findFirst({
        where: { id: d.responsavelAcaoId, isActive: true },
        select: pessoa,
      });
      if (!responsavel)
        throw new BadRequestException('Responsável pela ação inválido.');
      await this.iniciarTarefas(tx, a, u, ['CLASSIFICACAO']);
      await this.finalizarTarefas(
        tx,
        a,
        ['CLASSIFICACAO', 'ACAO_CORRETIVA'],
        u,
        a.status === 'AGUARDANDO_ACAO' ? 'CANCELADA' : 'CONCLUIDA',
      );
      a.prazo = new Date(d.prazo);
      await this.mudar(
        tx,
        a,
        u,
        'CLASSIFICADO',
        'CLASSIFICACAO_REALIZADA',
        'Classificação realizada.',
        { ...d, prazo: a.prazo, planoAcao: Prisma.DbNull, rnc: Prisma.DbNull },
      );
      await this.evento(
        tx,
        a,
        u,
        'AREA_DEFINIDA',
        `Área responsável: ${d.area}`,
        { dados: d },
      );
      await this.evento(
        tx,
        a,
        u,
        'RESPONSAVEL_ACAO_DEFINIDO',
        `Responsável pela ação: ${responsavel.name}`,
      );
      await this.tarefa(
        tx,
        a,
        u,
        'ACAO_CORRETIVA',
        'Executar ação corretiva',
        d.responsavelAcaoId,
      );
      await this.mudar(
        tx,
        a,
        u,
        'AGUARDANDO_ACAO',
        'AGUARDANDO_ACAO',
        'Aguardando início da ação corretiva.',
      );
      return tx.atendimentoSac.findUniqueOrThrow({ where: { id } });
    });
    // O proprietário de uma ação recebe somente a rota e os dados de sua tarefa.
    await this.notificacoes
      .notifyUsers([d.responsavelAcaoId], {
        title: `${a.protocolo}: ação pendente`,
        message: 'Uma ação corretiva foi atribuída a você.',
        link: `/atendimento/acoes?atendimento=${id}`,
        actorId: u.sub,
      })
      .catch(() => this.logger.warn('Falha na notificação de ação.'));
    return { sucesso: true };
  }
  private async verificarAcao(
    tx: Tx,
    u: UsuarioSac,
    a: AtendimentoSac,
    somenteAnexo = false,
  ) {
    if (this.gestor(u)) return;
    const t = await tx.atendimentoSacTarefa.findFirst({
      where: {
        atendimentoId: a.id,
        tipo: 'ACAO_CORRETIVA',
        responsavelId: u.sub,
        ...(somenteAnexo
          ? {}
          : {
              status: { in: ['PENDENTE', 'EM_ANDAMENTO'] as StatusTarefaSac[] },
            }),
      },
    });
    if (!t)
      throw new ForbiddenException(
        'Você pode atuar somente em ações atribuídas diretamente a você.',
      );
  }
  async minhasAcoes(u: UsuarioSac) {
    return this.prisma.atendimentoSacTarefa.findMany({
      where: { tipo: 'ACAO_CORRETIVA', responsavelId: u.sub },
      select: {
        id: true,
        titulo: true,
        status: true,
        prazo: true,
        criadoEm: true,
        iniciadoEm: true,
        concluidoEm: true,
        observacao: true,
        atendimento: {
          select: {
            id: true,
            protocolo: true,
            status: true,
            area: true,
            motivo: true,
            documento: true,
          },
        },
      },
      orderBy: { criadoEm: 'desc' },
      take: 100,
    });
  }
  async minhaAcao(u: UsuarioSac, id: string) {
    const tarefa = await this.prisma.atendimentoSacTarefa.findFirst({
      where: {
        atendimentoId: id,
        tipo: 'ACAO_CORRETIVA',
        responsavelId: u.sub,
        status: { not: 'CANCELADA' },
        atendimento: { is: { responsavelAcaoId: u.sub } },
      },
      orderBy: { criadoEm: 'desc' },
    });
    if (!tarefa) throw new ForbiddenException('Ação não atribuída a você.');
    return this.prisma.atendimentoSac.findUniqueOrThrow({
      where: { id },
      select: {
        id: true,
        protocolo: true,
        status: true,
        area: true,
        motivo: true,
        documento: true,
        prazo: true,
        planoAcao: true,
        anexos: {
          where: { etapa: 'ACAO_CORRETIVA', usuarioId: u.sub },
          select: {
            id: true,
            nome: true,
            tipo: true,
            comentario: true,
            etapa: true,
            criadoEm: true,
          },
        },
      },
    });
  }
  async plano(
    u: UsuarioSac,
    id: string,
    d: PlanoAcaoSacDto,
    concluir: boolean,
  ) {
    const a = await this.transacao(async (tx) => {
      const a = await this.registro(tx, id);
      await this.verificarAcao(tx, u, a);
      this.exigirStatus(a, ['AGUARDANDO_ACAO', 'EM_TRATATIVA']);
      if (
        concluir &&
        (!d.dataExecucao || !d.reporte?.trim() || d.reporte.trim().length < 3)
      )
        throw new BadRequestException(
          'Informe a data de execução e a conclusão/reporte.',
        );
      a.prazo = new Date(d.prazo);
      await tx.atendimentoSac.update({
        where: { id },
        data: {
          planoAcao: json({
            ...d,
            atualizadoPor: u.sub,
            atualizadoEm: new Date().toISOString(),
          }),
          prazo: a.prazo,
        },
      });
      await this.evento(
        tx,
        a,
        u,
        'PLANO_ACAO_REGISTRADO',
        'Plano da ação corretiva registrado.',
        { dados: d },
      );
      if (a.status === 'AGUARDANDO_ACAO')
        await this.mudar(
          tx,
          a,
          u,
          'EM_TRATATIVA',
          'ACAO_INICIADA',
          'Ação corretiva iniciada.',
        );
      await this.iniciarTarefas(tx, a, u, ['ACAO_CORRETIVA']);
      await tx.atendimentoSacTarefa.updateMany({
        where: {
          atendimentoId: id,
          tipo: 'ACAO_CORRETIVA',
          status: 'EM_ANDAMENTO',
        },
        data: { prazo: a.prazo },
      });
      if (concluir) {
        await this.finalizarTarefas(tx, a, ['ACAO_CORRETIVA'], u);
        await this.mudar(
          tx,
          a,
          u,
          'AGUARDANDO_AVALIACAO',
          'ACAO_CONCLUIDA',
          'Ação concluída; aguardando avaliação do atendente.',
        );
        await this.tarefa(
          tx,
          a,
          u,
          'AVALIACAO_SOLUCAO',
          'Avaliar solução da ocorrência',
          a.atendenteId,
        );
        await this.tarefa(
          tx,
          a,
          u,
          'REGISTRO_RNC',
          'Registrar decisão sobre RNC',
          a.atendenteId,
        );
      }
      return tx.atendimentoSac.findUniqueOrThrow({ where: { id } });
    });
    if (concluir && a.atendenteId)
      await this.notificar(
        a,
        u,
        [a.atendenteId],
        'Ação concluída. Avalie a solução e registre a decisão sobre RNC.',
      );
    return { sucesso: true };
  }
  async registrarRnc(u: UsuarioSac, id: string, d: RncSacDto) {
    if (
      d.gerou &&
      (
        [
          'numero',
          'data',
          'hora',
          'local',
          'setor',
          'motivo',
          'descricao',
        ] as const
      ).some((k) => !d[k]?.trim())
    )
      throw new BadRequestException('Preencha todos os campos da RNC.');
    await this.transacao(async (tx) => {
      const a = await this.registro(tx, id);
      this.verificarAtendente(u, a);
      this.exigirStatus(a, ['AGUARDANDO_AVALIACAO']);
      const dados = d.gerou ? d : { gerou: false };
      await tx.atendimentoSac.update({
        where: { id },
        data: { rnc: json(dados) },
      });
      await this.evento(
        tx,
        a,
        u,
        'RNC_REGISTRADA',
        d.gerou ? `RNC ${d.numero} registrada.` : 'A ocorrência não gerou RNC.',
        { dados },
      );
      await this.iniciarTarefas(tx, a, u, ['REGISTRO_RNC']);
      await this.finalizarTarefas(tx, a, ['REGISTRO_RNC'], u);
    });
    return { sucesso: true };
  }
  async avaliar(u: UsuarioSac, id: string, d: AvaliarSacDto) {
    const a = await this.transacao(async (tx) => {
      const a = await this.registro(tx, id);
      this.verificarAtendente(u, a);
      this.exigirStatus(a, ['AGUARDANDO_AVALIACAO']);
      if (!d.aprovado && (!d.motivo?.trim() || d.motivo.trim().length < 3))
        throw new BadRequestException('Informe o motivo da devolução.');
      if (d.aprovado && !a.rnc)
        throw new BadRequestException(
          'Registre se houve RNC antes de concluir.',
        );
      await this.iniciarTarefas(tx, a, u, ['AVALIACAO_SOLUCAO', 'CONCLUSAO']);
      await this.finalizarTarefas(
        tx,
        a,
        ['AVALIACAO_SOLUCAO', 'REGISTRO_RNC'],
        u,
      );
      if (d.aprovado) {
        await this.evento(tx, a, u, 'SOLUCAO_APROVADA', 'Solução aprovada.', {
          dados: { motivo: d.motivo },
        });
        await this.tarefa(
          tx,
          a,
          u,
          'CONCLUSAO',
          'Concluir atendimento',
          a.atendenteId,
        );
        await this.iniciarTarefas(tx, a, u, ['AVALIACAO_SOLUCAO', 'CONCLUSAO']);
        await this.finalizarTarefas(tx, a, ['ATENDIMENTO', 'CONCLUSAO'], u);
        await this.mudar(
          tx,
          a,
          u,
          'CONCLUIDO',
          'ATENDIMENTO_CONCLUIDO',
          'Atendimento concluído.',
          { concluidoEm: new Date(), concluidoPorId: u.sub },
        );
      } else {
        await this.mudar(
          tx,
          a,
          u,
          'EM_TRATATIVA',
          'SOLUCAO_DEVOLVIDA',
          `Solução devolvida para correção: ${d.motivo}`,
          { rnc: Prisma.DbNull },
        );
        await this.tarefa(
          tx,
          a,
          u,
          'ACAO_CORRETIVA',
          'Corrigir solução devolvida',
          a.responsavelAcaoId,
          d.motivo,
        );
      }
      return tx.atendimentoSac.findUniqueOrThrow({ where: { id } });
    });
    if (!d.aprovado && a.responsavelAcaoId)
      await this.notificacoes
        .notifyUsers([a.responsavelAcaoId], {
          title: `${a.protocolo}: correção solicitada`,
          message: d.motivo!,
          link: `/atendimento/acoes?atendimento=${id}`,
          actorId: u.sub,
        })
        .catch(() => this.logger.warn('Falha na notificação de devolução.'));
    return { sucesso: true };
  }
  async reabrir(u: UsuarioSac, id: string, d: ObservacaoSacDto) {
    if (!this.gestor(u))
      throw new ForbiddenException(
        'Somente o líder pode reabrir o atendimento.',
      );
    const a = await this.transacao(async (tx) => {
      const a = await this.registro(tx, id);
      this.exigirStatus(a, ['CONCLUIDO']);
      await this.mudar(
        tx,
        a,
        u,
        'REABERTO',
        'ATENDIMENTO_REABERTO',
        `Atendimento reaberto: ${d.observacao}`,
        { concluidoEm: null, concluidoPorId: null },
      );
      await this.tarefa(
        tx,
        a,
        u,
        a.atendenteId ? 'ATENDIMENTO' : 'TRIAGEM',
        'Retomar atendimento reaberto',
        a.atendenteId,
        d.observacao,
      );
      return a;
    });
    if (a.atendenteId)
      await this.notificar(a, u, [a.atendenteId], 'Atendimento reaberto.');
    return { sucesso: true };
  }
  async observar(u: UsuarioSac, id: string, d: ObservacaoSacDto) {
    await this.transacao(async (tx) => {
      const a = await this.registro(tx, id);
      this.verificarAtendente(u, a);
      await this.evento(tx, a, u, 'OBSERVACAO_ADICIONADA', d.observacao);
      await tx.atendimentoSac.update({
        where: { id },
        data: { atualizadoEm: new Date() },
      });
    });
    return { sucesso: true };
  }
  private diretorio() {
    return (
      this.config.get<string>('RELATOS_SITE_UPLOAD_DIR') ||
      join(process.cwd(), 'private-uploads', 'relatos-site')
    );
  }
  async anexar(
    u: UsuarioSac,
    id: string,
    d: AnexoSacDto,
    f: Express.Multer.File,
  ) {
    if (!f) throw new BadRequestException('Selecione um arquivo.');
    validarArquivoRelato(f);
    let armazenado:
      | Awaited<ReturnType<typeof guardarArquivoRelato>>
      | undefined;
    try {
      await this.transacao(async (tx) => {
        const a = await this.registro(tx, id);
        if (d.etapa === 'ACAO_CORRETIVA') {
          await this.verificarAcao(tx, u, a, true);
        } else {
          this.verificarAtendente(u, a);
        }
        const tarefa =
          d.etapa === 'ANEXOS'
            ? null
            : await tx.atendimentoSacTarefa.findFirst({
                where: {
                  atendimentoId: id,
                  tipo:
                    d.etapa === 'RNC'
                      ? TipoTarefaSac.REGISTRO_RNC
                      : (d.etapa as TipoTarefaSac),
                  ...(d.etapa === 'ACAO_CORRETIVA' && !this.gestor(u)
                    ? { responsavelId: u.sub }
                    : {}),
                  ...(d.tarefaId ? { id: d.tarefaId } : {}),
                },
              });
        if (d.tarefaId && !tarefa)
          throw new BadRequestException(
            'Tarefa não corresponde à etapa deste atendimento.',
          );
        if (!armazenado)
          armazenado = await guardarArquivoRelato(
            this.diretorio(),
            f,
            d.comentario,
          );
        const { id: anexoId, ...dados } = armazenado;
        await tx.atendimentoSacAnexo.create({
          data: {
            id: anexoId,
            ...dados,
            atendimentoId: id,
            etapa: d.etapa,
            usuarioId: u.sub,
            tarefaId: tarefa?.id,
          },
        });
        await this.evento(
          tx,
          a,
          u,
          'ANEXO_ADICIONADO',
          `Anexo adicionado na etapa ${d.etapa}: ${dados.nome}`,
          {
            tarefaId: tarefa?.id,
            dados: { anexoId, comentario: d.comentario },
          },
        );
        await tx.atendimentoSac.update({
          where: { id },
          data: { atualizadoEm: new Date() },
        });
      });
      return { sucesso: true };
    } catch (e) {
      if (armazenado)
        await unlink(join(this.diretorio(), armazenado.arquivo)).catch(
          () => undefined,
        );
      throw e;
    }
  }
  async baixar(u: UsuarioSac, id: string, anexoId: string) {
    const a = await this.prisma.atendimentoSac.findUnique({ where: { id } });
    if (!a) throw new NotFoundException('Atendimento não encontrado.');
    const anexo = await this.prisma.atendimentoSacAnexo.findFirst({
      where: { id: anexoId, atendimentoId: id },
    });
    if (!anexo) throw new NotFoundException('Anexo não encontrado.');
    if (
      !this.gestor(u) &&
      !(hasAnyRole(u, ['ATENDIMENTO']) && a.atendenteId === u.sub)
    ) {
      const tarefa = await this.prisma.atendimentoSacTarefa.findFirst({
        where: {
          atendimentoId: id,
          tipo: 'ACAO_CORRETIVA',
          responsavelId: u.sub,
        },
      });
      if (
        !tarefa ||
        anexo.etapa !== 'ACAO_CORRETIVA' ||
        anexo.usuarioId !== u.sub
      )
        throw new ForbiddenException('Anexo não autorizado para sua tarefa.');
    }
    return {
      nome: anexo.nome,
      tipo: anexo.tipo,
      conteudo: await lerArquivoRelato(this.diretorio(), anexo.arquivo),
    };
  }
}
