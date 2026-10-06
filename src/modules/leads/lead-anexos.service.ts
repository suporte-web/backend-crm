import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { join } from 'node:path';
import { unlink } from 'node:fs/promises';
import { PrismaService } from '../../prisma/prisma.service';
import {
  guardarArquivoRelato,
  lerArquivoRelato,
} from '../../common/arquivos-relatos';
import { LeadsService } from './leads.service';
import type { AuthUser } from '../auth/types/auth-user.type';

const campos = {
  id: true,
  leadId: true,
  nome: true,
  tipo: true,
  tamanho: true,
  comentario: true,
  criadoEm: true,
  usuario: { select: { id: true, name: true } },
} as const;
export const diretorioAnexosLead = () =>
  process.env.LEAD_ATTACHMENTS_UPLOAD_DIR ||
  join(process.cwd(), 'private-uploads', 'lead-anexos');

@Injectable()
export class LeadAnexosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leads: LeadsService,
  ) {}

  async listar(user: AuthUser, leadId: string) {
    await this.leads.findOne(user, leadId);
    return this.prisma.leadAnexo.findMany({
      where: { leadId },
      select: campos,
      orderBy: [{ criadoEm: 'desc' }, { id: 'asc' }],
    });
  }

  async anexar(
    user: AuthUser,
    leadId: string,
    file: Express.Multer.File,
    comentario?: string,
  ) {
    await this.leads.findOne(user, leadId);
    if (!file) throw new BadRequestException('Selecione um arquivo.');
    const armazenado = await guardarArquivoRelato(
      diretorioAnexosLead(),
      file,
      comentario,
    );
    try {
      return await this.prisma.$transaction(async (tx) => {
        const anexo = await tx.leadAnexo.create({
          data: { ...armazenado, leadId, usuarioId: user.sub },
          select: campos,
        });
        await tx.leadTimelineEvent.create({
          data: {
            leadId,
            type: 'UPDATED',
            title: 'Anexo adicionado',
            description: armazenado.nome,
            createdById: user.sub,
            metadata: { anexoId: anexo.id, comentario: armazenado.comentario },
          },
        });
        await tx.lead.update({
          where: { id: leadId },
          data: { updatedById: user.sub, lastInteractionAt: new Date() },
        });
        return anexo;
      });
    } catch (error) {
      await unlink(join(diretorioAnexosLead(), armazenado.arquivo)).catch(
        () => undefined,
      );
      throw error;
    }
  }

  async baixar(user: AuthUser, leadId: string, anexoId: string) {
    await this.leads.findOne(user, leadId);
    const anexo = await this.prisma.leadAnexo.findFirst({
      where: { id: anexoId, leadId },
    });
    if (!anexo) throw new NotFoundException('Anexo não encontrado.');
    return {
      nome: anexo.nome,
      tipo: anexo.tipo,
      buffer: await lerArquivoRelato(diretorioAnexosLead(), anexo.arquivo),
    };
  }
}
