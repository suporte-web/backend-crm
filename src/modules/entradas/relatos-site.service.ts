import { AtendimentoSacService } from '../atendimento-sac/atendimento-sac.service';
import {
  guardarArquivoRelato,
  validarArquivoRelato,
  lerArquivoRelato,
} from '../../common/arquivos-relatos';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'node:crypto';
import { mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { TicketsService } from '../tickets/tickets.service';
import { EntradasService } from './entradas.service';
import { RegistrarRelatoDto } from './dto/registrar-relato.dto';

type AnexoRelato = {
  id: string;
  nome: string;
  arquivo: string;
  tipo: string;
  tamanho: number;
  comentario: string | null;
};

@Injectable()
export class RelatosSiteService {
  private readonly logger = new Logger(RelatosSiteService.name);
  private readonly pendentes = new Map<
    string,
    Promise<{ protocolo: string | null; sucesso: boolean }>
  >();
  constructor(
    private readonly entradas: EntradasService,
    private readonly tickets: TicketsService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly sac: AtendimentoSacService,
  ) {}

  private diretorio() {
    return (
      this.config.get<string>('RELATOS_SITE_UPLOAD_DIR') ||
      join(process.cwd(), 'private-uploads', 'relatos-site')
    );
  }
  private async existente(identificador: string) {
    return this.prisma.ticket.findFirst({
      where: {
        origem: 'SITE',
        formPayload: { path: ['identificadorRelato'], equals: identificador },
      },
      select: { id: true, protocolo: true, formPayload: true },
    });
  }
  private validarArquivo(arquivo: Express.Multer.File) {
    return validarArquivoRelato(arquivo);
  }
  registrar(dto: RegistrarRelatoDto, arquivos: Express.Multer.File[] = []) {
    // Reenvios simultâneos da mesma solicitação aguardam a primeira gravação.
    const pendente = this.pendentes.get(dto.identificador);
    if (pendente) return pendente;
    const tarefa = this.gravar(dto, arquivos).finally(() =>
      this.pendentes.delete(dto.identificador),
    );
    this.pendentes.set(dto.identificador, tarefa);
    return tarefa;
  }
  private async gravar(
    dto: RegistrarRelatoDto,
    arquivos: Express.Multer.File[],
  ) {
    if (arquivos.length > 5)
      throw new BadRequestException('Envie no máximo 5 anexos.');
    if (
      dto.comentariosAnexos !== undefined &&
      (!Array.isArray(dto.comentariosAnexos) ||
        dto.comentariosAnexos.length !== arquivos.length ||
        dto.comentariosAnexos.some(
          (comentario) =>
            typeof comentario !== 'string' || comentario.length > 1000,
        ))
    ) {
      throw new BadRequestException(
        'Confira os comentários dos anexos. Máximo de 1000 caracteres por anexo.',
      );
    }
    arquivos.forEach((arquivo) => this.validarArquivo(arquivo));
    const assinatura = createHash('sha256')
      .update(JSON.stringify(dto))
      .update(
        arquivos
          .map((arquivo) =>
            createHash('sha256').update(arquivo.buffer).digest('hex'),
          )
          .join('|'),
      )
      .digest('hex');
    const anterior = await this.existente(dto.identificador);
    if (anterior) {
      const payload = anterior.formPayload as Record<string, unknown> | null;
      if (payload?.assinaturaRelato !== assinatura)
        throw new BadRequestException(
          'Esta solicitação já foi enviada. Inicie um novo registro.',
        );
      return this.sac.receberTicket(anterior.id);
    }
    const anexos: AnexoRelato[] = [];
    const diretorio = this.diretorio();
    try {
      if (arquivos.length) await mkdir(diretorio, { recursive: true });
      for (let indice = 0; indice < arquivos.length; indice++) {
        const anexo = await guardarArquivoRelato(
          diretorio,
          arquivos[indice],
          dto.comentariosAnexos?.[indice],
        );
        anexos.push(anexo);
      }
      const tipo = dto.tipo === 'ELOGIO' ? 'Elogio' : 'Reclamação';
      const ticket = await this.entradas.createFromSite(
        {
          nomeSolicitante: dto.nome,
          emailSolicitante: dto.email,
          telefoneSolicitante: dto.telefone,
          tipo: 'SUPORTE',
          prioridade: 'NORMAL',
          mensagem: `${tipo} — Canal do Cliente\nNome: ${dto.nome}\nTelefone: ${dto.telefone}\nE-mail: ${dto.email}\nEstado: ${dto.estado}\n\nRelato:\n${dto.relato}`,
          formPayload: {
            canal: 'RECLAMACOES_ELOGIOS',
            tipoRegistro: dto.tipo,
            estado: dto.estado,
            empresa: dto.empresa,
            cidade: dto.cidade,
            tipoReclamacao: dto.tipoReclamacao,
            documento: dto.documento,
            relato: dto.relato,
            identificadorRelato: dto.identificador,
            assinaturaRelato: assinatura,
            anexos,
          },
        },
        'sac',
      );
      return this.sac.receberTicket(ticket.id);
    } catch (erro) {
      // A criação existente grava antes das notificações. Não duplicar um atendimento se só a notificação falhar.
      const persistido = await this.existente(dto.identificador).catch(
        () => undefined,
      );
      if (persistido) {
        this.logger.warn(
          'Relato registrado; não foi possível concluir uma ação posterior ao registro.',
        );
        return this.sac.receberTicket(persistido.id);
      }
      if (persistido === null)
        await Promise.all(
          anexos.map((anexo) =>
            unlink(join(diretorio, anexo.arquivo)).catch(() => undefined),
          ),
        );
      throw erro;
    }
  }
  async baixar(
    user: { sub: string; role: string; roles?: string[] },
    ticketId: string,
    anexoId: string,
  ) {
    // A autorização é a mesma do atendimento existente; não há download público.
    const ticket = await this.tickets.findOne(user, ticketId);
    const payload = ticket.formPayload as Record<string, unknown> | null;
    const anexos = Array.isArray(payload?.anexos)
      ? (payload.anexos as AnexoRelato[])
      : [];
    const anexo =
      payload?.canal === 'RECLAMACOES_ELOGIOS'
        ? anexos.find((item) => item.id === anexoId)
        : undefined;
    if (!anexo || !/^[a-f0-9-]{36}\.(pdf|png|jpg|xls|xlsx)$/.test(anexo.arquivo))
      throw new NotFoundException('Anexo não encontrado.');
    const conteudo = await lerArquivoRelato(this.diretorio(), anexo.arquivo);
    return { conteudo, nome: anexo.nome, tipo: anexo.tipo };
  }
}
