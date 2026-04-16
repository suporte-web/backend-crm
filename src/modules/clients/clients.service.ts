import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateClientDto } from './dto/update-client.dto';

@Injectable()
export class ClientsService {
  constructor(private readonly prisma: PrismaService) { }

  private ensureInternalUser(user: { sub: string; role: string }) {
    const allowedRoles = ['ADMIN', 'GESTAO', 'COMERCIAL'];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException(
        'You do not have permission to access this resource',
      );
    }
  }

  async findMine(userId: string) {
    const client = await this.prisma.client.findUnique({
      where: { userId },
      include: {
        user: true,
        quotes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client profile not found');
    }

    return client;
  }

  async findAll(
    user: { sub: string; role: string },
    filters: {
      internalOwnerId?: string;
      status?: string;
      segment?: string;
    },
  ) {
    this.ensureInternalUser(user);

    const where: {
      internalOwnerId?: string;
      status?: string;
      segment?: string;
    } = {};

    if (filters.internalOwnerId) {
      where.internalOwnerId = filters.internalOwnerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.segment) {
      where.segment = filters.segment;
    }

    return this.prisma.client.findMany({
      where,
      include: {
        user: true,
        quotes: {
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

  async getMyPortfolio(
    user: { sub: string; role: string },
    filters: { status?: string; segment?: string },
  ) {
    this.ensureInternalUser(user);

    const where: {
      internalOwnerId: string;
      status?: string;
      segment?: string;
    } = {
      internalOwnerId: user.sub,
    };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.segment) {
      where.segment = filters.segment;
    }

    return this.prisma.client.findMany({
      where,
      include: {
        user: true,
        quotes: {
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

  async getOwnersSummary(user: { sub: string; role: string }) {
    this.ensureInternalUser(user);

    const internalUsers = await this.prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'GESTAO', 'COMERCIAL'],
        },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    const clients = await this.prisma.client.findMany({
      select: {
        id: true,
        internalOwnerId: true,
        status: true,
      },
    });

    return internalUsers.map((internalUser) => {
      const ownedClients = clients.filter(
        (client) => client.internalOwnerId === internalUser.id,
      );

      const activeClients = ownedClients.filter(
        (client) => client.status === 'ATIVO',
      );

      return {
        owner: internalUser,
        metrics: {
          totalClients: ownedClients.length,
          activeClients: activeClients.length,
        },
      };
    });
  }

  async findOne(user: { sub: string; role: string }, id: string) {
    this.ensureInternalUser(user);

    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        user: true,
        quotes: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    return client;
  }

  async getSummary(user: { sub: string; role: string }, id: string) {
    this.ensureInternalUser(user);

    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        user: true,
        quotes: {
          include: {
            history: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const totalQuotes = client.quotes.length;

    const quotesByStatus = client.quotes.reduce(
      (acc, quote) => {
        acc[quote.status] = (acc[quote.status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    const lastQuote = client.quotes[0] ?? null;

    const timeline = client.quotes
      .flatMap((quote) => {
        const createdEvent = {
          type: 'QUOTE_CREATED',
          date: quote.createdAt,
          quoteId: quote.id,
          title: 'Cotação criada',
          description: `${quote.origin} → ${quote.destination}`,
          status: quote.status,
        };

        const historyEvents = quote.history.map((history) => ({
          type: 'QUOTE_STATUS',
          date: history.createdAt,
          quoteId: quote.id,
          title: 'Status da cotação atualizado',
          description: history.notes ?? `Status alterado para ${history.status}`,
          status: history.status,
        }));

        return [createdEvent, ...historyEvents];
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);

    return {
      client: {
        id: client.id,
        document: client.document,
        phone: client.phone,
        companyName: client.companyName,
        segment: client.segment,
        notes: client.notes,
        status: client.status,
        internalOwnerId: client.internalOwnerId,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        user: {
          id: client.user.id,
          name: client.user.name,
          email: client.user.email,
          role: client.user.role,
        },
      },
      metrics: {
        totalQuotes,
        quotesByStatus,
      },
      lastQuote,
      timeline,
    };
  }

  async getTimeline(user: { sub: string; role: string }, id: string) {
    this.ensureInternalUser(user);

    const client = await this.prisma.client.findUnique({
      where: { id },
      include: {
        quotes: {
          include: {
            history: {
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const events = client.quotes.flatMap((quote) => {
      const createdEvent = {
        type: 'QUOTE_CREATED',
        date: quote.createdAt,
        quoteId: quote.id,
        title: 'Cotação criada',
        description: `${quote.origin} → ${quote.destination}`,
        status: quote.status,
      };

      const historyEvents = quote.history.map((history) => ({
        type: 'QUOTE_STATUS',
        date: history.createdAt,
        quoteId: quote.id,
        title: 'Status da cotação atualizado',
        description: history.notes ?? `Status alterado para ${history.status}`,
        status: history.status,
      }));

      return [createdEvent, ...historyEvents];
    });

    return events.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }

  async update(user: { sub: string; role: string }, id: string, dto: UpdateClientDto) {
    this.ensureInternalUser(user);

    await this.findOne(user, id);

    return this.prisma.client.update({
      where: { id },
      data: {
        document: dto.document,
        phone: dto.phone,
        companyName: dto.companyName,
        segment: dto.segment,
        notes: dto.notes,
        status: dto.status,
        internalOwnerId: dto.internalOwnerId,
      },
      include: {
        user: true,
        quotes: true,
      },
    });
  }
}

