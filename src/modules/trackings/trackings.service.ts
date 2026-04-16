import {
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { XMLParser } from 'fast-xml-parser';
import { QueryTrackingDto } from './dto/query-tracking.dto';

@Injectable()
export class TrackingsService {
  constructor(private readonly httpService: HttpService) {}

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

    const formData = new URLSearchParams();

    Object.entries(payload).forEach(([key, value]) => {
      formData.append(key, value);
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://ssw.inf.br/api/tracking',
          formData.toString(),
          {
            timeout: 15000,
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            responseType: 'text',
          },
        ),
      );

      const parser = new XMLParser({
        ignoreAttributes: false,
      });

      return parser.parse(response.data);
    } catch (error: any) {
      if (error.code === 'ECONNABORTED') {
        throw new GatewayTimeoutException(
          'Tempo limite excedido ao consultar rastreamento na SSW.',
        );
      }

      if (error.response) {
        throw new ServiceUnavailableException({
          message: 'Erro retornado pela API da SSW.',
          statusCode: error.response.status,
          data: error.response.data,
        });
      }

      throw new ServiceUnavailableException(
        'Não foi possível consultar o rastreamento na SSW.',
      );
    }
  }
}