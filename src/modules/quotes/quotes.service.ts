import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { RespondQuoteDto } from './dto/respond-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) { }

  private ensureInternalUser(user: { sub: string; role: string }) {
    const allowedRoles = ['ADMIN', 'AGENT', 'SALES'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('You do not have permission to perform this action');
    }
  }

  async create(clientId: string, dto: CreateQuoteDto) {
    return this.prisma.quote.create({
      data: {
        clientId,
        origin: dto.origin,
        destination: dto.destination,
        serviceType: dto.serviceType,
        weight: dto.weight,
        volume: dto.volume,
        quantity: dto.quantity,
        desiredDeadline: dto.desiredDeadline
          ? new Date(dto.desiredDeadline)
          : null,
        notes: dto.notes,
        history: {
          create: {
            status: QuoteStatus.RECEIVED,
            notes: 'Quote created by client',
          },
        },
      },
      include: {
        history: true,
      },
    });
  }

  async findMine(clientId: string) {
    return this.prisma.quote.findMany({
      where: { clientId },
      include: {
        history: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findAll(
    user: { sub: string; role: string },
    filters: { status?: string; clientId?: string },
  ) {
    this.ensureInternalUser(user);

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.clientId) {
      where.clientId = filters.clientId;
    }

    return this.prisma.quote.findMany({
      where,
      include: {
        client: {
          include: {
            user: true,
          },
        },
        history: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
  async findOne(user: { sub: string; role: string }, id: string) {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: {
        history: true,
        client: true,
      },
    });

    if (!quote) {
      throw new NotFoundException('Quote not found');
    }

    if (user.role === 'CLIENT' && quote.client.userId !== user.sub) {
      throw new NotFoundException('Quote not found');
    }

    return quote;
  }

  async updateStatus(
    user: { sub: string; role: string },
    id: string,
    dto: UpdateQuoteStatusDto,
  ) {
    this.ensureInternalUser(user);
    await this.findOne(user, id);

    return this.prisma.quote.update({
      where: { id },
      data: {
        status: dto.status,
        history: {
          create: {
            status: dto.status,
            notes: dto.notes,
          },
        },
      },
      include: {
        history: true,
      },
    });
  }

  async respond(
    user: { sub: string; role: string },
    id: string,
    dto: RespondQuoteDto,
  ) {
    this.ensureInternalUser(user);
    await this.findOne(user, id);

    return this.prisma.quote.update({
      where: { id },
      data: {
        price: dto.price,
        commercialNotes: dto.commercialNotes,
        status: QuoteStatus.ANSWERED,
        history: {
          create: {
            status: QuoteStatus.ANSWERED,
            notes: 'Commercial response sent',
          },
        },
      },
      include: {
        history: true,
      },
    });
  }
}