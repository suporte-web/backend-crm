import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, VisitaCliente } from '@prisma/client';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import {
  guardarArquivoRelato,
  lerArquivoRelato,
  validarArquivoRelato,
} from '../../common/arquivos-relatos';
import { hasAnyRole } from '../../common/user-roles';
import { AtendimentoSacService } from '../atendimento-sac/atendimento-sac.service';
import {
  AnexoVisitaDto,
  AtualizarVisitaDto,
  CriarVisitaDto,
  FiltroVisitaDto,
  ParticipanteVisitaDto,
  PosVisitaDto,
  RealizarVisitaDto,
  ReagendarVisitaDto,
  ValidarVisitaDto,
} from './dto/dados-visita.dto';
import {
  exigirAcesso,
  exigirEtapa,
  exigirGestor,
  exigirPerfil,
  gestorVisitas,
  UsuarioVisita,
} from './visitas.policy';
type Tx = Prisma.TransactionClient;
const pessoa = {
  id: true,
  name: true,
  email: true,
  role: true,
  roles: true,
} as const;
const resumo = {
  responsavel: { select: pessoa },
  sac: { select: { id: true, protocolo: true, status: true } },
} as const;
const json = (v: unknown) =>
  JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;
const texto = (v?: string | null) => !!v?.trim();
const agendamento = [
  'AGENDADA',
  'AGUARDANDO_REALIZACAO',
  'REAGENDAMENTO',
] as const;

@Injectable()
export class VisitasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly sac: AtendimentoSacService,
    private readonly config: ConfigService,
  ) {}
  private async transacao<T>(run: (tx: Tx) => Promise<T>): Promise<T> {
    for (let i = 0; i < 3; i++) {
      try {
        return await this.prisma.$transaction(run, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          timeout: 15000,
        });
      } catch (e) {
        if (
          !(e instanceof Prisma.PrismaClientKnownRequestError) ||
          e.code !== 'P2034' ||
          i === 2
        )
          throw e;
      }
    }
    throw new ConflictException('Atualize e tente novamente.');
  }
  private async registro(tx: Tx, u: UsuarioVisita, id: string) {
    const v = await tx.visitaCliente.findUnique({
      where: { id },
      include: resumo,
    });
    if (!v) throw new NotFoundException('Visita não encontrada.');
    exigirAcesso(u, v.responsavelId);
    return v;
  }
  private async evento(
    tx: Tx,
    u: UsuarioVisita,
    v: VisitaCliente,
    tipo: string,
    descricao: string,
    statusNovo = v.status,
    dados?: unknown,
    observacao?: string,
  ) {
    await tx.visitaHistorico.create({
      data: {
        visitaId: v.id,
        usuarioId: u.sub,
        tipo,
        descricao,
        statusAnterior: v.status,
        statusNovo,
        observacao,
        dados: dados === undefined ? undefined : json(dados),
      },
    });
  }
  private async responsavel(tx: Tx, id: string) {
    const usuario = await tx.user.findUnique({
      where: { id },
      select: { id: true, isActive: true, role: true, roles: true },
    });
    if (
      !usuario?.isActive ||
      !hasAnyRole(usuario, [
        'ADMIN',
        'GESTAO',
        'LIDER_ATENDIMENTO',
        'ATENDIMENTO',
      ])
    )
      throw new BadRequestException(
        'Selecione um responsável ativo da equipe de atendimento.',
      );
  }
  private async participantes(tx: Tx, dados: ParticipanteVisitaDto[]) {
    const usuarios = new Set<string>();
    const emails = new Set<string>();
    const resultado: Array<{
      nome: string;
      email?: string;
      telefone?: string;
      usuarioId?: string;
    }> = [];
    for (const p of dados) {
      if (p.usuarioId) {
        if (usuarios.has(p.usuarioId))
          throw new BadRequestException('Participante duplicado.');
        usuarios.add(p.usuarioId);
        const usuario = await tx.user.findUnique({
          where: { id: p.usuarioId },
          select: { id: true, name: true, email: true, isActive: true },
        });
        if (!usuario?.isActive)
          throw new BadRequestException(
            'Participante inativo ou não encontrado.',
          );
        resultado.push({
          nome: usuario.name,
          email: usuario.email,
          telefone: p.telefone,
          usuarioId: usuario.id,
        });
      } else
        resultado.push({ nome: p.nome, email: p.email, telefone: p.telefone });
      const email = resultado[resultado.length - 1]?.email?.toLowerCase();
      if (email && emails.has(email))
        throw new BadRequestException('E-mail de participante duplicado.');
      if (email) emails.add(email);
    }
    return resultado;
  }
  async criar(u: UsuarioVisita, d: CriarVisitaDto) {
    exigirGestor(u);
    const id = await this.transacao(async (tx) => {
      await this.responsavel(tx, d.responsavelId);
      const participantes = await this.participantes(tx, d.participantes || []);
      const v = await tx.visitaCliente.create({
        data: {
          clienteNome: d.clienteNome,
          cnpj: d.cnpj?.trim() || null,
          localVisita: d.localVisita,
          dataPrevista: new Date(d.dataPrevista),
          responsavelId: d.responsavelId,
          criadoPorId: u.sub,
          tipoVisita: d.tipoVisita,
          observacoes: d.observacoes,
          participantes: { create: participantes },
        },
      });
      const protocolo = 'VIS-' + String(v.numero).padStart(6, '0');
      await tx.visitaCliente.update({
        where: { id: v.id },
        data: { protocolo },
      });
      await this.evento(tx, u, v, 'CRIADA', 'Visita criada', v.status, {
        ...d,
        protocolo,
        cnpj: d.cnpj?.trim() || null,
      });
      await this.evento(
        tx,
        u,
        v,
        'ATRIBUIDA',
        'Visita atribuída ao responsável',
        v.status,
        { responsavelId: d.responsavelId, dataPrevista: d.dataPrevista },
      );
      return v.id;
    });
    return this.detalhe(u, id);
  }
  async listar(u: UsuarioVisita, d: FiltroVisitaDto) {
    exigirPerfil(u);
    const fim = d.fim ? new Date(d.fim) : undefined;
    if (fim && /^\d{4}-\d{2}-\d{2}$/.test(d.fim!))
      fim.setUTCHours(23, 59, 59, 999);
    if (d.inicio && fim && new Date(d.inicio) > fim)
      throw new BadRequestException('Período inválido.');
    const where: Prisma.VisitaClienteWhereInput = {
      responsavelId: gestorVisitas(u) ? d.responsavelId : u.sub,
      protocolo: d.protocolo
        ? { contains: d.protocolo, mode: 'insensitive' }
        : undefined,
      status: d.status,
      tipoVisita: d.tipoVisita
        ? { contains: d.tipoVisita, mode: 'insensitive' }
        : undefined,
      OR: d.cliente ? [
        { clienteNome: { contains: d.cliente, mode: 'insensitive' } },
        { cnpj: { contains: d.cliente, mode: 'insensitive' } },
      ] : undefined,
      dataPrevista:
        d.inicio || fim
          ? { gte: d.inicio ? new Date(d.inicio) : undefined, lte: fim }
          : undefined,
    };
    const pagina = Number(d.pagina || 1);
    const [itens, total, grupos] = await this.prisma.$transaction([
      this.prisma.visitaCliente.findMany({
        where,
        include: resumo,
        orderBy: [{ dataPrevista: 'desc' }, { id: 'desc' }],
        skip: (pagina - 1) * 30,
        take: 30,
      }),
      this.prisma.visitaCliente.count({ where }),
      this.prisma.visitaCliente.groupBy({
        by: ['status'],
        orderBy: { status: 'asc' },
        where: { ...where, status: undefined },
        _count: { _all: true },
      }),
    ]);
    return {
      itens,
      total,
      pagina,
      porPagina: 30,
      contagens: Object.fromEntries(
        grupos.map((g) => [
          g.status,
          typeof g._count === 'object' ? (g._count._all ?? 0) : 0,
        ]),
      ),
    };
  }
  async opcoes(u: UsuarioVisita) {
    exigirPerfil(u);
    const usuarios = await this.prisma.user.findMany({
      where: { isActive: true },
      select: pessoa,
      orderBy: { name: 'asc' },
    });
    const responsaveis = usuarios.filter((p) =>
      hasAnyRole(p, ['ADMIN', 'GESTAO', 'LIDER_ATENDIMENTO', 'ATENDIMENTO']),
    );
    return { usuarios, responsaveis };
  }
  async detalhe(u: UsuarioVisita, id: string) {
    // Autoriza antes de consultar dados sensíveis de histórico/anexos.
    await this.registro(this.prisma, u, id);
    return this.prisma.visitaCliente.findUniqueOrThrow({
      where: { id },
      include: {
        ...resumo,
        criadoPor: { select: pessoa },
        participantes: true,
        realizacoes: {
          include: { usuario: { select: pessoa } },
          orderBy: { criadoEm: 'asc' },
        },
        validacoes: {
          include: { gestor: { select: pessoa } },
          orderBy: { criadoEm: 'asc' },
        },
        reagendamentos: {
          include: { usuario: { select: pessoa } },
          orderBy: { criadoEm: 'asc' },
        },
        historico: {
          include: { usuario: { select: pessoa } },
          orderBy: [{ criadoEm: 'asc' }, { id: 'asc' }],
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
          },
          orderBy: { criadoEm: 'asc' },
        },
      },
    });
  }
  async historico(u: UsuarioVisita, id: string) {
    return (await this.detalhe(u, id)).historico;
  }
  async atualizar(u: UsuarioVisita, id: string, d: AtualizarVisitaDto) {
    exigirGestor(u);
    await this.transacao(async (tx) => {
      const v = await this.registro(tx, u, id);
      exigirEtapa(v.status, [...agendamento]);
      if (
        d.dataPrevista &&
        new Date(d.dataPrevista).getTime() !== v.dataPrevista.getTime()
      )
        throw new BadRequestException(
          'Use o reagendamento para alterar a data prevista.',
        );
      if (d.participantes)
        await this.adicionarParticipantesTx(tx, u, v, d.participantes);
      if (d.responsavelId) await this.responsavel(tx, d.responsavelId);
      const dados = {
        clienteNome: d.clienteNome,
        cnpj: d.cnpj === undefined ? undefined : d.cnpj?.trim() || null,
        responsavelId: d.responsavelId,
        localVisita: d.localVisita,
        tipoVisita: d.tipoVisita,
        observacoes: d.observacoes,
      };
      await tx.visitaCliente.update({ where: { id }, data: dados });
      await this.evento(
        tx,
        u,
        v,
        'DADOS_ATUALIZADOS',
        'Dados da visita atualizados',
        v.status,
        { anterior: v, alteracoes: dados },
      );
      if (d.responsavelId && d.responsavelId !== v.responsavelId)
        await this.evento(
          tx,
          u,
          v,
          'ATRIBUIDA',
          'Responsável da visita alterado',
          v.status,
          { anterior: v.responsavelId, novo: d.responsavelId },
        );
    });
    return { sucesso: true };
  }
  private async adicionarParticipantesTx(
    tx: Tx,
    u: UsuarioVisita,
    v: VisitaCliente,
    d: ParticipanteVisitaDto[],
  ) {
    const id = v.id;
    const existentes = await tx.visitaParticipante.findMany({
      where: { visitaId: id },
    });
    const participantes = await this.participantes(tx, d);
    if (
      participantes.some((p) =>
        existentes.some(
          (e) =>
            (p.usuarioId && p.usuarioId === e.usuarioId) ||
            (p.email && p.email.toLowerCase() === e.email?.toLowerCase()),
        ),
      )
    )
      throw new BadRequestException('Participante já incluído nesta visita.');
    if (!participantes.length)
      throw new BadRequestException('Informe pelo menos um participante.');
    await tx.visitaParticipante.createMany({
      data: participantes.map((p) => ({ ...p, visitaId: id })),
    });
    await this.evento(
      tx,
      u,
      v,
      'PARTICIPANTES_ADICIONADOS',
      'Participantes adicionados',
      v.status,
      participantes,
    );
    await tx.visitaCliente.update({
      where: { id },
      data: { atualizadoEm: new Date() },
    });
  }
  async adicionarParticipantes(
    u: UsuarioVisita,
    id: string,
    d: ParticipanteVisitaDto[],
  ) {
    exigirGestor(u);
    await this.transacao(async (tx) => {
      const v = await this.registro(tx, u, id);
      exigirEtapa(v.status, [...agendamento]);
      await this.adicionarParticipantesTx(tx, u, v, d);
    });
    return { sucesso: true };
  }
  async iniciar(u: UsuarioVisita, id: string) {
    await this.transacao(async (tx) => {
      const v = await this.registro(tx, u, id);
      exigirEtapa(v.status, ['AGENDADA', 'REAGENDAMENTO']);
      await tx.visitaCliente.update({
        where: { id },
        data: { status: 'AGUARDANDO_REALIZACAO' },
      });
      await this.evento(
        tx,
        u,
        v,
        'INICIADA',
        'Visita aguardando realização',
        'AGUARDANDO_REALIZACAO',
      );
    });
    return { sucesso: true };
  }
  private async salvarReagendamento(
    tx: Tx,
    u: UsuarioVisita,
    v: VisitaCliente,
    d: ReagendarVisitaDto,
  ) {
    if (new Date(d.novaData).getTime() === v.dataPrevista.getTime())
      throw new BadRequestException(
        'A nova data deve ser diferente da data anterior.',
      );
    await tx.visitaReagendamento.create({
      data: {
        visitaId: v.id,
        usuarioId: u.sub,
        dataAnterior: v.dataPrevista,
        novaData: new Date(d.novaData),
        motivo: d.motivo,
        observacoes: d.observacoes,
      },
    });
    await tx.visitaCliente.update({
      where: { id: v.id },
      data: { dataPrevista: new Date(d.novaData), status: 'REAGENDAMENTO' },
    });
    await this.evento(
      tx,
      u,
      v,
      'REAGENDADA',
      'Visita reagendada',
      'REAGENDAMENTO',
      { dataAnterior: v.dataPrevista, ...d },
      d.motivo,
    );
  }
  async reagendar(u: UsuarioVisita, id: string, d: ReagendarVisitaDto) {
    await this.transacao(async (tx) => {
      const v = await this.registro(tx, u, id);
      exigirEtapa(v.status, [...agendamento]);
      await this.salvarReagendamento(tx, u, v, d);
    });
    return { sucesso: true };
  }
  async realizar(u: UsuarioVisita, id: string, d: RealizarVisitaDto) {
    await this.transacao(async (tx) => {
      const v = await this.registro(tx, u, id);
      exigirEtapa(v.status, ['AGUARDANDO_REALIZACAO', 'REAGENDAMENTO']);
      if (d.teveCusto && (!d.custo || d.custo <= 0))
        throw new BadRequestException('Informe o custo da visita.');
      if (!d.teveCusto && d.custo != null)
        throw new BadRequestException(
          'Informe custo apenas quando houve custo.',
        );
      if (new Date(d.dataRealizada).getTime() > Date.now())
        throw new BadRequestException(
          'A data realizada não pode estar no futuro.',
        );
      const dados = {
        ...d,
        dataRealizada: new Date(d.dataRealizada),
        custo: d.teveCusto ? d.custo : null,
        insights: d.insights ?? null,
        pontosPositivos: d.pontosPositivos ?? null,
        pontosAtencao: d.pontosAtencao ?? null,
        contatoPessoaAtendeu: d.contatoPessoaAtendeu ?? null,
        emailPessoaAtendeu: d.emailPessoaAtendeu ?? null,
      };
      await tx.visitaRealizacao.create({
        data: {
          visitaId: id,
          usuarioId: u.sub,
          dataRealizada: dados.dataRealizada,
          dados: json(dados),
        },
      });
      await tx.visitaCliente.update({
        where: { id },
        data: { ...dados, status: 'AGUARDANDO_VALIDACAO' },
      });
      await this.evento(
        tx,
        u,
        v,
        'REALIZADA',
        'Visita realizada',
        v.status,
        dados,
      );
      await this.evento(
        tx,
        u,
        v,
        'ENVIADA_VALIDACAO',
        'Encaminhada para validação da gestão',
        'AGUARDANDO_VALIDACAO',
      );
    });
    return { sucesso: true };
  }
  async validar(u: UsuarioVisita, id: string, d: ValidarVisitaDto) {
    exigirGestor(u);
    await this.transacao(async (tx) => {
      const v = await this.registro(tx, u, id);
      exigirEtapa(v.status, ['AGUARDANDO_VALIDACAO']);
      if (
        d.decisao !== 'APROVAR' &&
        (!texto(d.observacao) || d.observacao!.trim().length < 3)
      )
        throw new BadRequestException('Descreva o que precisa ajustar.');
      if (d.decisao === 'REAGENDAR' && !d.novaData)
        throw new BadRequestException('Informe a nova data proposta.');
      await tx.visitaValidacao.create({
        data: {
          visitaId: id,
          gestorId: u.sub,
          decisao: d.decisao,
          observacao: d.observacao,
        },
      });
      if (d.decisao === 'REAGENDAR')
        await this.salvarReagendamento(tx, u, v, {
          motivo: d.observacao!,
          novaData: d.novaData!,
        });
      else {
        const status =
          d.decisao === 'APROVAR' ? 'POS_VISITA' : 'AGUARDANDO_REALIZACAO';
        await tx.visitaCliente.update({ where: { id }, data: { status } });
        await this.evento(
          tx,
          u,
          v,
          d.decisao === 'APROVAR' ? 'APROVADA' : 'AJUSTE_SOLICITADO',
          d.decisao === 'APROVAR'
            ? 'Visita aprovada pela gestão'
            : 'Ajuste solicitado pela gestão',
          status,
          d,
          d.observacao,
        );
      }
      if (d.decisao === 'REAGENDAR')
        await this.evento(
          tx,
          u,
          v,
          'VALIDACAO_REAGENDAMENTO',
          'Gestão solicitou reagendamento',
          'REAGENDAMENTO',
          d,
          d.observacao,
        );
    });
    return { sucesso: true };
  }
  async posVisita(u: UsuarioVisita, id: string, d: PosVisitaDto) {
    await this.transacao(async (tx) => {
      const v = await this.registro(tx, u, id);
      exigirEtapa(v.status, ['POS_VISITA']);
      if (d.possuiMelhoria && !texto(d.melhoriaIdentificada))
        throw new BadRequestException('Descreva a melhoria identificada.');
      if (d.gerarSac && (!texto(d.tipoReclamacao) || !texto(d.relatoSac)))
        throw new BadRequestException(
          'Informe o tipo da reclamação e o relato do SAC.',
        );
      const reagendamentos = await tx.visitaReagendamento.count({
        where: { visitaId: id },
      });
      if (reagendamentos > 0 && d.novaDataAceita == null)
        throw new BadRequestException(
          'Informe se a nova data proposta foi aceita.',
        );
      if (d.novaDataAceita === false) {
        if (!texto(d.ajustesNecessarios))
          throw new BadRequestException('Descreva o que precisa ajustar.');
        await tx.visitaCliente.update({
          where: { id },
          data: { status: 'AGUARDANDO_VALIDACAO', novaDataAceita: false },
        });
        await this.evento(
          tx,
          u,
          v,
          'DATA_NAO_ACEITA',
          'Nova data não aceita; encaminhada à gestão para ajuste',
          'AGUARDANDO_VALIDACAO',
          d,
          d.ajustesNecessarios,
        );
        return;
      }
      let sacId: string | undefined;
      if (d.gerarSac) {
        const sac = await this.sac.criarDaVisita(tx, u, {
          visitaId: id,
          protocoloVisita: v.protocolo!,
          cnpj: v.cnpj,
          responsavelId: v.responsavelId,
          nome: v.pessoaAtendeu || v.clienteNome,
          email: d.email || v.emailPessoaAtendeu || undefined,
          telefone: d.telefone || v.contatoPessoaAtendeu || undefined,
          empresa: v.clienteNome,
          cidade: d.cidade,
          estado: d.estado,
          tipoReclamacao: d.tipoReclamacao!,
          relato: d.relatoSac!,
        });
        sacId = sac.id;
      }
      const status = d.gerarSac ? 'ATENDIMENTO_SAC' : 'CONCLUIDA';
      await tx.visitaCliente.update({
        where: { id },
        data: {
          novaDataAceita: d.novaDataAceita,
          atingiuObjetivo: d.atingiuObjetivo,
          sentimentoCliente: d.sentimentoCliente,
          possuiMelhoria: d.possuiMelhoria,
          melhoriaIdentificada: d.possuiMelhoria
            ? d.melhoriaIdentificada
            : null,
          classificacao: d.classificacao,
          avaliacaoRegistradaEm: new Date(),
          sacId,
          status,
          concluidoEm: d.gerarSac ? null : new Date(),
        },
      });
      await this.evento(
        tx,
        u,
        v,
        'AVALIACAO_REGISTRADA',
        'Avaliação final registrada',
        status,
        d,
      );
      await this.evento(
        tx,
        u,
        v,
        d.gerarSac ? 'SAC_CRIADO' : 'CONCLUIDA',
        d.gerarSac
          ? 'Atendimento SAC criado e relacionado à visita'
          : 'Visita concluída',
        status,
        d.gerarSac ? { sacId } : undefined,
      );
    });
    return { sucesso: true };
  }
  async concluir(u: UsuarioVisita, id: string) {
    await this.transacao(async (tx) => {
      const v = await this.registro(tx, u, id);
      exigirEtapa(v.status, ['ATENDIMENTO_SAC']);
      if (v.sac?.status !== 'CONCLUIDO')
        throw new ConflictException(
          'Conclua o atendimento SAC relacionado antes de concluir a visita.',
        );
      await tx.visitaCliente.update({
        where: { id },
        data: { status: 'CONCLUIDA', concluidoEm: new Date() },
      });
      await this.evento(
        tx,
        u,
        v,
        'CONCLUIDA',
        'Visita concluída após atendimento SAC',
        'CONCLUIDA',
      );
    });
    return { sucesso: true };
  }
  private diretorio() {
    return (
      this.config.get<string>('VISITAS_UPLOAD_DIR') ||
      join(process.cwd(), 'private-uploads', 'visitas')
    );
  }
  async anexar(
    u: UsuarioVisita,
    id: string,
    d: AnexoVisitaDto,
    f?: Express.Multer.File,
  ) {
    if (!f) throw new BadRequestException('Selecione um arquivo.');
    validarArquivoRelato(f);
    let arquivo: Awaited<ReturnType<typeof guardarArquivoRelato>> | undefined;
    try {
      await this.transacao(async (tx) => {
        const v = await this.registro(tx, u, id);
        if (d.etapa === 'VALIDACAO') exigirGestor(u);
        const etapas = {
          VISITA: [...agendamento],
          REALIZACAO: ['AGUARDANDO_REALIZACAO', 'REAGENDAMENTO'],
          VALIDACAO: ['AGUARDANDO_VALIDACAO'],
          POS_VISITA: ['POS_VISITA'],
        };
        exigirEtapa(v.status, etapas[d.etapa] as VisitaCliente['status'][]);
        arquivo ??= await guardarArquivoRelato(
          this.diretorio(),
          f,
          d.comentario,
        );
        await tx.visitaAnexo.create({
          data: { ...arquivo, visitaId: id, usuarioId: u.sub, etapa: d.etapa },
        });
        await this.evento(
          tx,
          u,
          v,
          'ANEXO_ADICIONADO',
          'Anexo adicionado: ' + arquivo.nome,
          v.status,
          { anexoId: arquivo.id, etapa: d.etapa },
          d.comentario,
        );
        await tx.visitaCliente.update({
          where: { id },
          data: { atualizadoEm: new Date() },
        });
      });
    } catch (e) {
      if (arquivo)
        await unlink(join(this.diretorio(), arquivo.arquivo)).catch(
          () => undefined,
        );
      throw e;
    }
    return { sucesso: true };
  }
  async baixar(u: UsuarioVisita, id: string, anexoId: string) {
    await this.registro(this.prisma, u, id);
    const a = await this.prisma.visitaAnexo.findFirst({
      where: { id: anexoId, visitaId: id },
    });
    if (!a) throw new NotFoundException('Anexo não encontrado.');
    return {
      nome: a.nome,
      tipo: a.tipo,
      conteudo: await lerArquivoRelato(this.diretorio(), a.arquivo),
    };
  }
}
