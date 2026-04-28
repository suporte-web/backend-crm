import { ForbiddenException, Injectable } from '@nestjs/common';
import {
  AuditLogAction,
  AuditLogCategory,
  AuditLogLevel,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';
import { QueryAuditLogsDto } from './dto/query-audit-logs.dto';

type CreateAuditLogInput = {
  category: AuditLogCategory;
  action: AuditLogAction;
  level?: AuditLogLevel;
  message: string;
  details?: Prisma.InputJsonValue;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  method?: string;
  targetType?: string;
  targetId?: string;
  success?: boolean;
  userId?: string | null;
};

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureCanView(user: AuthUser) {
    if (!['ADMIN', 'GESTAO'].includes(user.role)) {
      throw new ForbiddenException('Acesso aos logs restrito a ADMIN e GESTAO.');
    }
  }

  private parseDateStart(value?: string) {
    if (!value) {
      return undefined;
    }

    const date = new Date(`${value}T00:00:00.000Z`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private parseDateEnd(value?: string) {
    if (!value) {
      return undefined;
    }

    const date = new Date(`${value}T23:59:59.999Z`);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  private buildWhere(filters: QueryAuditLogsDto): Prisma.AuditLogWhereInput {
    const createdAt: Prisma.DateTimeFilter = {};
    const dateFrom = this.parseDateStart(filters.dateFrom);
    const dateTo = this.parseDateEnd(filters.dateTo);

    if (dateFrom) {
      createdAt.gte = dateFrom;
    }

    if (dateTo) {
      createdAt.lte = dateTo;
    }

    const where: Prisma.AuditLogWhereInput = {
      ...(Object.keys(createdAt).length ? { createdAt } : {}),
      ...(filters.category ? { category: filters.category } : {}),
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.level ? { level: filters.level } : {}),
      ...(filters.userId ? { userId: filters.userId } : {}),
    };

    if (filters.success === 'true' || filters.success === 'false') {
      where.success = filters.success === 'true';
    }

    if (filters.q?.trim()) {
      const query = filters.q.trim();
      where.OR = [
        { message: { contains: query, mode: 'insensitive' } },
        { targetType: { contains: query, mode: 'insensitive' } },
        { targetId: { contains: query, mode: 'insensitive' } },
        { user: { name: { contains: query, mode: 'insensitive' } } },
        { user: { email: { contains: query, mode: 'insensitive' } } },
      ];
    }

    return where;
  }

  private normalizeTake(value?: string) {
    const parsed = Number(value ?? 250);

    if (!Number.isFinite(parsed) || parsed <= 0) {
      return 250;
    }

    return Math.min(Math.trunc(parsed), 1000);
  }

  async create(input: CreateAuditLogInput) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          category: input.category,
          action: input.action,
          level: input.level ?? AuditLogLevel.INFO,
          message: input.message,
          details: input.details,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          route: input.route,
          method: input.method,
          targetType: input.targetType,
          targetId: input.targetId,
          success: input.success ?? true,
          userId: input.userId,
        },
      });
    } catch {
      return null;
    }
  }

  async findAll(user: AuthUser, filters: QueryAuditLogsDto) {
    this.ensureCanView(user);

    return this.prisma.auditLog.findMany({
      where: this.buildWhere(filters),
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: this.normalizeTake(filters.take),
    });
  }

  async getSummary(user: AuthUser, filters: QueryAuditLogsDto) {
    this.ensureCanView(user);
    const where = this.buildWhere(filters);
    const [total, successCount, errorCount, byCategory] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.count({ where: { ...where, success: true } }),
      this.prisma.auditLog.count({
        where: {
          ...where,
          OR: [{ success: false }, { level: AuditLogLevel.ERROR }],
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['category'],
        where,
        _count: {
          _all: true,
        },
      }),
    ]);

    return {
      total,
      successCount,
      errorCount,
      byCategory: byCategory.map((item) => ({
        category: item.category,
        count: item._count._all,
      })),
    };
  }

  async exportCsv(user: AuthUser, filters: QueryAuditLogsDto) {
    const rows = await this.findAll(user, { ...filters, take: filters.take ?? '1000' });
    const headers = [
      'Data',
      'Usuario',
      'Email',
      'Categoria',
      'Acao',
      'Nivel',
      'Sucesso',
      'Mensagem',
      'Alvo',
      'IP',
    ];
    const body = rows.map((row) => [
      row.createdAt.toISOString(),
      row.user?.name ?? '-',
      row.user?.email ?? '-',
      row.category,
      row.action,
      row.level,
      row.success ? 'Sim' : 'Nao',
      row.message,
      [row.targetType, row.targetId].filter(Boolean).join(':') || '-',
      row.ipAddress ?? '-',
    ]);

    return `\ufeff${[headers, ...body]
      .map((line) =>
        line
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(';'),
      )
      .join('\n')}`;
  }
}
