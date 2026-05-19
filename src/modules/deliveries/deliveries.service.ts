import { Injectable } from '@nestjs/common';
import { QueryDeliveriesDto } from './dto/query-deliveries.dto';
import { PostgresDeliveriesService } from './database/postgres-deliveries.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  buildDeliveriesQuery,
  buildDeliveriesSummaryQuery,
} from './sql/deliveries.sql';

type DeliveryRow = {
  cgc_pag: string;
  data_ref: string;
  seq_ctrc: string;
  ser_ctrc: string;
  nro_ctrc: string;
  seq_manifesto: string | null;
  data_entrega: string | null;
  hora_entrega: string | null;
  data_prev_ent: string | null;
  nome_cli_dest: string;
  data_ult_ocor: string | null;
  ult_ocor: string | null;
  sigla_fil_emit: string;
  ocorrencia: string;
  cidade_origem: string;
  cidade_dest: string;
  uf_dest: string;
  status_entrega: 'Entregue' | 'Pendente' | 'Em atraso';
  em_atraso: 'Sim' | 'Não';
  sla_entrega: 'DENTRO DO SLA' | 'FORA DO SLA' | '-';
  classificacao_rota: string;
};

type DeliverySummaryRow = {
  totalPedidos: number;
  entregues: number;
  pendentes: number;
  emAtraso: number;
  entregueDentroDoSla: number;
  entregueForaDoSla: number;
  porcentagemEntrega: number | string;
};

@Injectable()
export class DeliveriesService {
  constructor(
    private readonly postgresDeliveriesService: PostgresDeliveriesService,
    private readonly prisma: PrismaService,
  ) {}

  private normalizeDocument(value?: string | null) {
    return value?.replace(/\D/g, '') || '';
  }

  private async getClientDocumentFilter(user: { sub: string; role: string }) {
    if (user.role !== 'CLIENTE') {
      return undefined;
    }

    const client = await this.prisma.client.findUnique({
      where: { userId: user.sub },
      select: { document: true },
    });

    return this.normalizeDocument(client?.document) || '__NO_CLIENT_DOCUMENT__';
  }

  async findAll(filters: QueryDeliveriesDto, user: { sub: string; role: string }) {
    const clientDocument = await this.getClientDocumentFilter(user);
    const query = buildDeliveriesQuery(filters, clientDocument);

    return this.postgresDeliveriesService.query<DeliveryRow>(
      query.text,
      query.values,
    );
  }

  async getSummary(filters: QueryDeliveriesDto, user: { sub: string; role: string }) {
    const clientDocument = await this.getClientDocumentFilter(user);
    const query = buildDeliveriesSummaryQuery(filters, clientDocument);
    const [summary] =
      await this.postgresDeliveriesService.query<DeliverySummaryRow>(
        query.text,
        query.values,
      );

    // A API sempre devolve numeros consistentes para o dashboard.
    return {
      totalPedidos: Number(summary?.totalPedidos || 0),
      entregues: Number(summary?.entregues || 0),
      pendentes: Number(summary?.pendentes || 0),
      emAtraso: Number(summary?.emAtraso || 0),
      entregueDentroDoSla: Number(summary?.entregueDentroDoSla || 0),
      entregueForaDoSla: Number(summary?.entregueForaDoSla || 0),
      porcentagemEntrega: Number(summary?.porcentagemEntrega || 0),
    };
  }
}
