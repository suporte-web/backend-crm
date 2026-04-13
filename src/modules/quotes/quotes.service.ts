import { Injectable, NotFoundException } from '@nestjs/common';
import { QuoteStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { RespondQuoteDto } from './dto/respond-quote.dto';
import { UpdateQuoteStatusDto } from './dto/update-quote-status.dto';

@Injectable()
export class QuotesService {
  constructor(private readonly prisma: PrismaService) {}

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

  async findOne(id: string) {
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

    return quote;
  }

  async updateStatus(id: string, dto: UpdateQuoteStatusDto) {
    await this.findOne(id);

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

  async respond(id: string, dto: RespondQuoteDto) {
    await this.findOne(id);

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