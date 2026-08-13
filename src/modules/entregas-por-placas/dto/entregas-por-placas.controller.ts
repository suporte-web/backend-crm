import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiInternalServerErrorResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { ConsultarEntregasPorPlacaDto } from './consultar-entregas-por-placas.dto';
import { ConsultarMonitoramentoEntregasPorPlacasDto } from './consultar-monitoramento-entregas-por-placas.dto';
import { EntregasPorPlacasService } from './entregas-por-placas.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Entregas por placas')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('entregas-por-placas')
export class EntregasPorPlacasController {
  constructor(
    private readonly entregasPorPlacasService: EntregasPorPlacasService,
  ) {}

@Get('monitoramento')
@ApiOperation({
  summary: 'Monitorar entregas por placa e motorista',
  description:
    'Consulta romaneios do dia agrupados por placa, motorista e rota, com totais de CTRCs entregues e pendentes.',
})
buscarMonitoramento(
  @Query() dto: ConsultarMonitoramentoEntregasPorPlacasDto,
) {
  return this.entregasPorPlacasService.buscarMonitoramento(dto);
}

  @Get()
  @ApiOperation({
    summary: 'Consultar entregas por placa',
    description:
      'Consulta as entregas, o manifesto e o motorista vinculados à placa informada.',
  })
  @ApiOkResponse({
    description: 'Entregas consultadas com sucesso.',
    schema: {
      example: {
        success: true,
        placa: 'ABC1D23',
        total: 1,
        data: [
          {
            cgc_pag: '12345678000100',
            data_ref: '2026-08-04T00:00:00.000Z',
            seq_ctrc: 123,
            ser_ctrc: '1',
            nro_ctrc: 456789,
            seq_manifesto: 999,
            data_entrega: null,
            hora_entrega: null,
            data_prev_ent: '2026-08-05T00:00:00.000Z',
            nome_cli_dest: 'Cliente exemplo',
            data_ult_ocor: '2026-08-04T10:00:00.000Z',
            ult_ocor: 10,
            sigla_fil_emit: 'CWB',
            ocorrencia: 'Mercadoria em rota de entrega',
            cidade_origem: 'Curitiba',
            cidade_dest: 'São Paulo',
            uf_dest: 'SP',
            placa_cavalo: 'ABC1D23',
            nome_motorista: 'Motorista exemplo',
          },
        ],
      },
    },
  })
  @ApiBadRequestResponse({
    description: 'A placa não foi informada ou está inválida.',
    schema: {
      example: {
        message: [
          'Informe uma placa válida, como ABC1234 ou ABC1D23',
        ],
        error: 'Bad Request',
        statusCode: 400,
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: 'Erro ao consultar as entregas no banco de dados.',
  })
  buscarPorPlaca(
    @Query() dto: ConsultarEntregasPorPlacaDto,
  ) {
    return this.entregasPorPlacasService.buscarPorPlaca(dto);
  }
}
