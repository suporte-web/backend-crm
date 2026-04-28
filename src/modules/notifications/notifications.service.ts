import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  TicketHistoryEventType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { AuthUser } from '../auth/types/auth-user.type';

type PrismaClientLike = PrismaService | Prisma.TransactionClient;

type TicketNotificationInput = {
  ticketId?: string | null;
  title: string;
  message: string;
  link?: string | null;
  actorId?: string | null;
  emailSubject?: string;
  emailSummary?: string;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeRecipients(userIds: Array<string | null | undefined>) {
    return Array.from(
      new Set(userIds.filter((userId): userId is string => Boolean(userId))),
    );
  }

  private getClient(tx?: Prisma.TransactionClient): PrismaClientLike {
    return tx ?? this.prisma;
  }

  async getUserIdsByRoles(
    roles: UserRole[],
    tx?: Prisma.TransactionClient,
  ) {
    const client = this.getClient(tx);

    const users = await client.user.findMany({
      where: {
        role: {
          in: roles,
        },
        isActive: true,
      },
      select: {
        id: true,
      },
    });

    return users.map((user) => user.id);
  }

  async notifyRoles(
    roles: UserRole[],
    input: TicketNotificationInput,
    tx?: Prisma.TransactionClient,
  ) {
    const userIds = await this.getUserIdsByRoles(roles, tx);
    return this.notifyUsers(userIds, input, tx);
  }

  async notifyUsers(
    userIds: Array<string | null | undefined>,
    input: TicketNotificationInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = this.getClient(tx);
    const recipients = this.normalizeRecipients(userIds);
    const link = input.link ?? (input.ticketId ? `/tickets?ticket=${input.ticketId}` : null);
    const recipientUsers =
      recipients.length > 0
        ? await client.user.findMany({
            where: {
              id: {
                in: recipients,
              },
            },
            select: {
              id: true,
              name: true,
              email: true,
            },
          })
        : [];
    let emailDelivery = process.env.EMAIL_WEBHOOK_URL
      ? 'webhook_configured_without_recipients'
      : 'registered_without_provider';

    if (process.env.EMAIL_WEBHOOK_URL && recipientUsers.length > 0) {
      try {
        const response = await fetch(process.env.EMAIL_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: recipientUsers.map((recipient) => ({
              name: recipient.name,
              email: recipient.email,
            })),
            subject: input.emailSubject ?? input.title,
            title: input.title,
            message: input.message,
            summary: input.emailSummary ?? input.message,
            link,
            ticketId: input.ticketId ?? null,
            actorId: input.actorId ?? null,
            sentAt: new Date().toISOString(),
          }),
        });

        emailDelivery = response.ok ? 'webhook_sent' : 'webhook_failed';
      } catch {
        emailDelivery = 'webhook_failed';
      }
    }

    if (recipients.length > 0) {
      await client.notification.createMany({
        data: recipients.map((userId) => ({
          userId,
          ticketId: input.ticketId ?? null,
          title: input.title,
          message: input.message,
          link,
          metadata: input.metadata,
        })),
      });
    }

    if (input.ticketId) {
      await client.ticketHistory.create({
        data: {
          ticketId: input.ticketId,
          eventType: TicketHistoryEventType.NOTIFICATION_SENT,
          title: 'Notificacao enviada',
          description: input.message,
          createdById: input.actorId ?? null,
          metadata: {
            recipients,
            title: input.title,
            link,
          },
        },
      });

      await client.ticketHistory.create({
        data: {
          ticketId: input.ticketId,
          eventType: TicketHistoryEventType.EMAIL_SENT,
          title: 'E-mail registrado',
          description: input.emailSummary ?? input.message,
          createdById: input.actorId ?? null,
          metadata: {
            recipients,
            recipientEmails: recipientUsers.map((recipient) => recipient.email),
            subject: input.emailSubject ?? input.title,
            link,
            delivery: emailDelivery,
          },
        },
      });
    }

    return {
      recipients,
      count: recipients.length,
    };
  }

  async markTicketNotificationsRead(userId: string, ticketId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        ticketId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });
  }

  async findMine(user: AuthUser) {
    return this.prisma.notification.findMany({
      where: {
        userId: user.sub,
      },
      include: {
        ticket: {
          select: {
            id: true,
            subject: true,
            status: true,
            type: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 30,
    });
  }

  async unreadCount(user: AuthUser) {
    const count = await this.prisma.notification.count({
      where: {
        userId: user.sub,
        readAt: null,
      },
    });

    return { count };
  }

  async markRead(user: AuthUser, id: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      throw new NotFoundException('Notificacao nao encontrada.');
    }

    if (notification.userId !== user.sub) {
      throw new ForbiddenException('Notificacao nao encontrada.');
    }

    return this.prisma.notification.update({
      where: { id },
      data: {
        readAt: notification.readAt ?? new Date(),
      },
    });
  }

  async markAllRead(user: AuthUser) {
    await this.prisma.notification.updateMany({
      where: {
        userId: user.sub,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return this.unreadCount(user);
  }
}
