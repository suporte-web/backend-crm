import { Controller, Get, Header, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ConsultaRastreamentoPublicoDto } from './dto/consulta-rastreamento-publico.dto';
import { RastreamentoPublicoService } from './rastreamento-publico.service';

@ApiTags('Rastreamento público')
@Controller('public/trackings')
export class RastreamentoPublicoController {
  constructor(private readonly rastreamento: RastreamentoPublicoService) {}

  @Get(':codigo')
  @Header('Cache-Control', 'no-store')
  consultar(@Param('codigo') codigo: string, @Query() consulta: ConsultaRastreamentoPublicoDto) {
    return this.rastreamento.consultar(codigo, consulta);
  }
}
