import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuditLogAction, AuditLogCategory } from '@prisma/client';
import { randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { CreateSupplierInviteDto } from './dto/create-supplier-invite.dto';

@Injectable()
export class SuppliersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  private ensureInternalUser(user: AuthUser) {
    if (!['ADMIN', 'GESTAO', 'COMERCIAL'].includes(user.role)) {
      throw new ForbiddenException('Voce nao tem permissao para convidar fornecedores.');
    }
  }

  private sanitize(value?: string | null) {
    const trimmed = value?.trim();
    return trimmed || null;
  }

  private buildInviteUrl(token: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${frontendUrl.replace(/\/$/, '')}/fornecedores/cadastro?convite=${token}`;
  }

  async createInvite(user: AuthUser, dto: CreateSupplierInviteDto) {
    this.ensureInternalUser(user);

    const companyName = this.sanitize(dto.companyName);
    const email = this.sanitize(dto.email)?.toLowerCase();

    if (!companyName || !email) {
      throw new BadRequestException('Informe empresa e e-mail do fornecedor.');
    }

    const invite = await this.prisma.supplierInvite.create({
      data: {
        companyName,
        email,
        contactName: this.sanitize(dto.contactName),
        phone: this.sanitize(dto.phone),
        notes: this.sanitize(dto.notes),
        token: randomBytes(24).toString('hex'),
        invitedById: user.sub,
      },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.SYSTEM,
      action: AuditLogAction.SUPPLIER_INVITED,
      message: `Convite enviado para fornecedor ${companyName}.`,
      targetType: 'SupplierInvite',
      targetId: invite.id,
      userId: user.sub,
      details: {
        companyName,
        email,
      },
    });

    return {
      ...invite,
      inviteUrl: this.buildInviteUrl(invite.token),
    };
  }

  async findInvites(user: AuthUser) {
    this.ensureInternalUser(user);

    const invites = await this.prisma.supplierInvite.findMany({
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invites.map((invite) => ({
      ...invite,
      inviteUrl: this.buildInviteUrl(invite.token),
    }));
  }
}
