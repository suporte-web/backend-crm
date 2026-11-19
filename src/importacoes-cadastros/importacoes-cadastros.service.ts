import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { basename, extname } from 'node:path';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { hasAnyRole } from '../common/user-roles';
import { modalidadesPermitidas } from '../common/permissoes-cadastros';
import { empresaConsultoraDoUsuario } from '../common/empresa-consultora-access';
import { capturarProspeccao } from '../common/prospeccao';
import { normalizarContatoLead } from '../common/cadastros';
import { perfisResponsavelComercial, resolverResponsavelComercial } from '../cadastros/responsavel-comercial';
import { classificarCnae, resolverSegmentoCadastro } from '../segmentos/segmentos.service';
import { normalizarNomeSegmento } from '../segmentos/segmentos.catalogo';
import { chaveNome, etapaPlanilha, lerPlanilha } from './ler-planilha';
import type { LinhaPlanilha, LinhaPrevia } from './importacoes-cadastros.types';
import { ConfirmarImportacaoDto, ETAPAS_IMPORTACAO, PrepararImportacaoDto } from './dtos/importacao-cadastro.dto';

type Banco = Prisma.TransactionClient;
type Leitura = Awaited<ReturnType<typeof lerPlanilha>>;
const json = (valor: unknown) => JSON.parse(JSON.stringify(valor)) as Prisma.InputJsonValue;
const origemLinha = (hash: string, empresaId: string | null, aba: string, numero: number) => createHash('sha256').update(JSON.stringify([hash, empresaId, aba, numero])).digest('hex');

@Injectable()
export class ImportacoesCadastrosService {
  constructor(private readonly prisma: PrismaService) {}

  private async autorizar(user: AuthUser) {
    if (!hasAnyRole(user, perfisResponsavelComercial) || !(await modalidadesPermitidas(this.prisma, user)).includes('LEAD')) throw new ForbiddenException('Seu perfil não pode importar novos Leads em Cadastros.');
    if (hasAnyRole(user, ['CONSULTORA'])) empresaConsultoraDoUsuario(user);
  }
  private escopo(user: AuthUser) {
    return { usuarioId: user.sub, ...(hasAnyRole(user, ['CONSULTORA']) ? { empresaConsultoraId: empresaConsultoraDoUsuario(user) } : {}) };
  }
  async opcoes(user: AuthUser) {
    await this.autorizar(user);
    const consultora = hasAnyRole(user, ['CONSULTORA']);
    return this.prisma.user.findMany({ where: {
      isActive: true,
      ...(consultora ? { empresaConsultoraId: empresaConsultoraDoUsuario(user) } : {}),
      AND: [
        { OR: [{ role: { in: consultora ? ['CONSULTORA'] : [...perfisResponsavelComercial] } }, { roles: { hasSome: consultora ? ['CONSULTORA'] : [...perfisResponsavelComercial] } }] },
        { OR: [{ empresaConsultoraId: null }, { empresaConsultora: { is: { ativa: true } } }] },
      ],
    }, select: { id: true, name: true, empresaConsultoraId: true, empresaConsultora: { select: { id: true, nome: true } } }, orderBy: [{ name: 'asc' }, { id: 'asc' }] });
  }
  async listar(user: AuthUser) {
    await this.autorizar(user);
    return this.prisma.importacaoCadastro.findMany({ where: this.escopo(user), select: { id: true, arquivo: true, status: true, createdAt: true, completedAt: true, resultado: true }, orderBy: { createdAt: 'desc' }, take: 10 });
  }
  async obter(user: AuthUser, id: string) {
    await this.autorizar(user);
    const job = await this.prisma.importacaoCadastro.findFirst({ where: { id, ...this.escopo(user) } });
    if (!job) throw new NotFoundException('Importação não encontrada.');
    return job;
  }

  private async previa(tx: Banco, dados: Leitura, user: AuthUser, hash: string, empresaId: string | null): Promise<LinhaPrevia[]> {
    const permitidas = await modalidadesPermitidas(tx as PrismaService, user);
    const [base, segmentos] = await Promise.all([
      tx.client.findMany({ select: {
        id: true, companyName: true, legalName: true, tradeName: true, document: true, phone: true, modalidadeCadastro: true, empresaConsultoraId: true, chaveImportacao: true,
        contacts: { select: { email: true, phone: true } },
        leadCadastro: { select: { normalizedEmail: true, normalizedPhone: true } },
      } }),
      tx.segmento.findMany({ where: { ativo: true }, orderBy: { nome: 'asc' } }),
    ]);
    const consultora = hasAnyRole(user, ['CONSULTORA']);
    const classificacoes = new Map<string, Awaited<ReturnType<typeof classificarCnae>>>();
    const resultado: LinhaPrevia[] = [];
    for (const linha of dados.linhas) {
      const nome = chaveNome(linha.nome), telefone = linha.telefone.replace(/\D/g, '');
      const chave = origemLinha(hash, empresaId, dados.aba, linha.numero);
      const duplicidades: LinhaPrevia['duplicidades'] = [];
      for (const registro of base) {
        const nomes = [registro.companyName, registro.legalName, registro.tradeName].filter((item): item is string => Boolean(item)).map(chaveNome);
        const nomeCompativel = nomes.some(item => item === nome || (Math.min(item.length, nome.length) >= 5 && (item.startsWith(nome + ' ') || nome.startsWith(item + ' '))));
        const emails = [registro.leadCadastro?.normalizedEmail, ...registro.contacts.map(item => item.email?.trim().toLowerCase())];
        const telefones = [registro.phone, registro.leadCadastro?.normalizedPhone, ...registro.contacts.map(item => item.phone)].map(item => item?.replace(/\D/g, ''));
        const motivo = registro.chaveImportacao === chave ? 'Esta linha já foi importada.' : linha.documento && registro.document?.replace(/\D/g, '') === linha.documento ? 'CNPJ já cadastrado.' : nomeCompativel ? 'Nome igual ou semelhante.' : linha.emails.some(item => emails.includes(item)) ? 'E-mail já cadastrado.' : telefone.length >= 8 && telefones.includes(telefone) ? 'Telefone já cadastrado.' : '';
        if (!motivo) continue;
        const visivel = permitidas.includes(registro.modalidadeCadastro) && (!consultora || registro.empresaConsultoraId === empresaId);
        duplicidades.push(visivel ? { id: registro.id, nome: registro.companyName || registro.legalName || registro.tradeName || 'Cadastro existente', motivo } : { nome: 'Correspondência fora da sua carteira', motivo: 'Peça à gestão para conferir o cadastro existente.' });
        if (duplicidades.length >= 10) break;
      }
      if (dados.linhas.some(item => item.numero !== linha.numero && chaveNome(item.nome) === nome)) duplicidades.push({ nome: linha.nome, motivo: 'Nome repetido na própria planilha.' });
      if (linha.documento && dados.linhas.some(item => item.numero !== linha.numero && item.documento === linha.documento)) duplicidades.push({ nome: linha.nome, motivo: 'CNPJ repetido na própria planilha.' });
      if (linha.emails.some(email => dados.linhas.some(item => item.numero !== linha.numero && item.emails.includes(email)))) duplicidades.push({ nome: linha.nome, motivo: 'E-mail repetido na própria planilha.' });
      let segmento: { id: string; nome: string } | null = null;
      let segmentoPorCnae = false;
      if (linha.cnae) {
        if (!classificacoes.has(linha.cnae)) classificacoes.set(linha.cnae, await classificarCnae(tx, linha.cnae));
        segmento = classificacoes.get(linha.cnae) ?? null;
        segmentoPorCnae = Boolean(segmento);
      }
      if (!segmento && linha.segmentoOriginal) {
        const encontrados = segmentos.filter(item => [item.nome, ...item.aliases].some(alias => normalizarNomeSegmento(alias) === normalizarNomeSegmento(linha.segmentoOriginal)));
        if (encontrados.length === 1) segmento = encontrados[0];
      }
      resultado.push({ ...linha, etapaSugerida: etapaPlanilha(linha.funilOriginal), segmentoId: segmento?.id ?? null, segmentoNome: segmento?.nome ?? null, segmentoPorCnae, duplicidades, selecionavel: !linha.erros.length && !duplicidades.length });
    }
    return resultado;
  }

  async preparar(user: AuthUser, file: { buffer: Buffer; originalname: string } | undefined, dto: PrepararImportacaoDto) {
    await this.autorizar(user);
    if (!file || extname(file.originalname).toLowerCase() !== '.xlsx') throw new BadRequestException('Envie uma planilha XLSX.');
    const responsavel = await resolverResponsavelComercial(this.prisma, user, dto.responsavelId);
    if (!responsavel?.id) throw new BadRequestException('Selecione o responsável pela carteira.');
    const empresaId = responsavel.empresaConsultoraId ?? null;
    if (dto.empresaConsultoraId !== undefined && dto.empresaConsultoraId !== empresaId) throw new BadRequestException('O responsável não pertence à empresa selecionada.');
    const dados = await lerPlanilha(file.buffer);
    const hash = createHash('sha256').update(file.buffer).digest('hex');
    const linhas = await this.previa(this.prisma, dados, user, hash, empresaId);
    return this.prisma.importacaoCadastro.create({ data: {
      arquivo: basename(file.originalname).slice(0, 200), hashArquivo: hash, aba: dados.aba,
      usuarioId: user.sub, responsavelId: responsavel.id, empresaConsultoraId: empresaId,
      linhas: json({ ...dados, linhas }), expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    } });
  }

  async confirmar(user: AuthUser, id: string, dto: ConfirmarImportacaoDto) {
    await this.autorizar(user);
    if (!dto.linhas?.length || dto.linhas.length > 200 || new Set(dto.linhas.map(item => item.numero)).size !== dto.linhas.length) throw new BadRequestException('Selecione de 1 a 200 linhas distintas.');
    if (dto.linhas.some(item => !ETAPAS_IMPORTACAO.includes(item.etapa as never))) throw new BadRequestException('Selecione uma etapa válida para cada linha.');
    try {
      return await this.prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(741, 182026) IS NULL AS bloqueio`;
        await tx.$queryRaw`SELECT id FROM "ImportacaoCadastro" WHERE id = ${id} FOR UPDATE`;
        const job = await tx.importacaoCadastro.findFirst({ where: { id, ...this.escopo(user) } });
        if (!job) throw new NotFoundException('Importação não encontrada.');
        if (job.status === 'CONCLUIDA') return job; // retry após perda da resposta não duplica dados.
        if (job.status !== 'PREVIA' || job.expiresAt.getTime() <= Date.now()) throw new ConflictException('A prévia expirou. Envie a planilha novamente.');
        const responsavel = await resolverResponsavelComercial(tx, user, job.responsavelId);
        if (!responsavel?.id || (responsavel.empresaConsultoraId ?? null) !== job.empresaConsultoraId) throw new ConflictException('O vínculo do responsável mudou. Gere uma nova prévia.');
        const dados = job.linhas as unknown as Leitura;
        const linhas = await this.previa(tx, dados, user, job.hashArquivo, job.empresaConsultoraId);
        const selecionadas = dto.linhas.map(decisao => ({ decisao, linha: linhas.find(item => item.numero === decisao.numero) }));
        if (selecionadas.some(item => !item.linha?.selecionavel)) throw new ConflictException('Há linhas inválidas ou novas duplicidades. Gere uma nova prévia antes de confirmar.');
        const origem = await capturarProspeccao(tx, user);
        const criados: Array<{ numero: number; id: string; nome: string }> = [];
        for (const { decisao, linha: valor } of selecionadas) {
          const linha = valor!;
          const classificacao = await resolverSegmentoCadastro(tx, {
            cnae: linha.cnae,
            segmentoAutomatico: decisao.segmentoAutomatico === true,
            segmentoId: decisao.segmentoId,
            segment: decisao.segmentoId === null ? '' : linha.segmentoOriginal,
          }, undefined, 'IMPORTACAO');
          const historico = [
            `Importado de ${job.arquivo}, aba ${job.aba}, linha ${linha.numero}.`,
            linha.funilOriginal && `Funil original: ${linha.funilOriginal}`,
            linha.segmentoOriginal && `Segmento original: ${linha.segmentoOriginal}`,
            linha.notasMcg && `Histórico MCG:\n${linha.notasMcg}`,
            linha.notasPzt && `Histórico PZT:\n${linha.notasPzt}`,
            linha.retorno && `Retorno do cliente:\n${linha.retorno}`,
            linha.siteOriginal && `Site / link original: ${linha.siteOriginal}`,
            linha.prioridade && `Prioridade original: ${linha.prioridade}`,
            linha.contatoPrioritario && `Contato prioritário original: ${linha.contatoPrioritario}`,
            linha.papelContato && `Papel provável do contato: ${linha.papelContato}`,
            linha.potencial && `Potencial: ${linha.potencial}`,
          ].filter(Boolean).join('\n\n');
          const contatos = linha.emails.length ? linha.emails : (linha.contato || linha.telefone ? [''] : []);
          const cadastro = await tx.client.create({ data: {
            companyName: linha.nome, modalidadeCadastro: 'LEAD', status: 'PENDENTE', document: linha.documento || null,
            phone: linha.telefone || null, siteUrl: linha.siteUrl || null, notes: historico,
            ...classificacao, ...origem, internalOwnerId: user.sub, responsavelId: job.responsavelId,
            empresaConsultoraId: job.empresaConsultoraId,
            chaveImportacao: origemLinha(job.hashArquivo, job.empresaConsultoraId, job.aba, linha.numero),
            contacts: { create: contatos.map((email, indice) => ({ name: indice === 0 ? linha.contato || null : null, email: email || null, phone: indice === 0 ? linha.telefone || null : null, isPrimary: indice === 0 })) },
          } });
          const lead = await tx.lead.create({ data: {
            cadastroId: cadastro.id, name: linha.contato || linha.nome, company: linha.nome,
            email: linha.emails[0] || null, phone: linha.telefone || null,
            ...normalizarContatoLead(linha.emails[0], linha.telefone), ...origem,
            source: 'planilha', status: decisao.etapa, notes: historico, createdById: user.sub, updatedById: user.sub,
            metadata: json({ segment: cadastro.segment, responsible: responsavel.name, nextAction: linha.proximaAcao, importacaoCadastro: { jobId: job.id, arquivo: job.arquivo, aba: job.aba, ...linha } }),
            timeline: { create: { type: 'CREATED_MANUAL', title: 'Cadastro importado de planilha', description: `Linha ${linha.numero} de ${job.arquivo}. Textos históricos preservados sem atribuir datas presumidas.`, createdById: user.sub } },
          } });
          await tx.client.update({ where: { id: cadastro.id }, data: { sourceLeadId: lead.id } });
          await tx.timelineEvent.create({ data: { clientId: cadastro.id, type: 'LEAD_CREATED', title: 'Cadastro importado', description: `Importação ${job.id}, linha ${linha.numero}.`, createdById: user.sub } });
          await tx.auditLog.create({ data: { category: 'CLIENT', action: 'CUSTOM', userId: user.sub, targetType: 'Client', targetId: cadastro.id, message: 'Novo Lead importado de planilha.', details: { importacaoId: job.id, linha: linha.numero, empresaConsultoraId: job.empresaConsultoraId, responsavelId: job.responsavelId, segmentoOrigem: cadastro.segmentoOrigem } } });
          criados.push({ numero: linha.numero, id: cadastro.id, nome: linha.nome });
        }
        const resultado = { criados, ignorados: linhas.filter(item => !dto.linhas.some(decisao => decisao.numero === item.numero)).map(item => ({ numero: item.numero, nome: item.nome, motivo: item.erros.join(' ') || item.duplicidades.map(d => d.motivo).join(' ') || 'Não selecionado na confirmação.' })) };
        return tx.importacaoCadastro.update({ where: { id }, data: { status: 'CONCLUIDA', completedAt: new Date(), resultado: json(resultado) } });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 60000 });
    } catch (erro) {
      if (erro instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2034'].includes(erro.code)) throw new ConflictException('A base mudou durante a importação. Confira o relatório ou envie a planilha novamente.');
      throw erro;
    }
  }
}
