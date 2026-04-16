import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TicketStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketStatusDto } from './dto/update-ticket-status.dto';

@Injectable()
export class TicketsService {
  constructor(private readonly prisma: PrismaService) {}

  private ensureInternalUser(user: { sub: string; role: string }) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }
  }

  async create(userId: string, dto: CreateTicketDto) {
    const client = await this.prisma.client.findUnique({
      where: { userId },
    });

    if (!client) {
      throw new NotFoundException('Client profile not found');
    }

    return this.prisma.ticket.create({
      data: {
        clientId: client.id,
        subject: dto.subject,
        description: dto.description,
      },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    });
  }

  async findMine(userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { userId },
    });

    if (!client) {
      throw new NotFoundException('Client profile not found');
    }

    return this.prisma.ticket.findMany({
      where: { clientId: client.id },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAll(
    user: { sub: string; role: string },
    filters: { status?: string },
  ) {
    this.ensureInternalUser(user);

    const where: { status?: TicketStatus } = {};

    if (filters.status) {
      where.status = filters.status as TicketStatus;
    }

    return this.prisma.ticket.findMany({
      where,
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(user: { sub: string; role: string }, id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    if (
      user.role === 'CLIENTE' &&
      ticket.client.userId !== user.sub
    ) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  async updateStatus(
    user: { sub: string; role: string },
    id: string,
    dto: UpdateTicketStatusDto,
  ) {
    this.ensureInternalUser(user);
    await this.findOne(user, id);

    return this.prisma.ticket.update({
      where: { id },
      data: {
        status: dto.status,
      },
      include: {
        client: {
          include: {
            user: true,
          },
        },
      },
    });
  }
}