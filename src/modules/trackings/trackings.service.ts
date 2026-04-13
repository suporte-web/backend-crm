import { BadRequestException, Injectable } from '@nestjs/common';
import { QueryTrackingDto } from './dto/query-tracking.dto';

@Injectable()
export class TrackingsService {
  async queryTracking(dto: QueryTrackingDto) {
    const payload: Record<string, string> = {
      cnpj: dto.cnpj,
    };

    if (dto.senha) {
      payload.senha = dto.senha;
    }

    if (dto.siglaEmp) {
      payload.sigla_emp = dto.siglaEmp;
    }

    payload[dto.tipoConsulta] = dto.valor;

    const consultationFieldCount = [
      payload.nro_nf,
      payload.pedido,
      payload.chave_nfe,
      payload.nro_coleta,
    ].filter(Boolean).length;

    if (consultationFieldCount !== 1) {
      throw new BadRequestException(
        'Envie exatamente um tipo de consulta válido.',
      );
    }

    return {
      endpoint: 'https://ssw.inf.br/api/trackingdest',
      method: 'POST',
      message: 'Payload montado com sucesso para consulta na SSW.',
      payload,
    };
  }
}