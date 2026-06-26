import {
  BadRequestException,
  GatewayTimeoutException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import type { AxiosResponse } from 'axios';
import { XMLParser } from 'fast-xml-parser';
import { firstValueFrom } from 'rxjs';
import { QueryTrackingDto } from './dto/query-tracking.dto';

type ParsedTrackingResponse = Record<string, unknown>;

@Injectable()
export class TrackingsService {
  private readonly sswTrackingUrl = 'https://ssw.inf.br/api/trackingdest';

  constructor(private readonly httpService: HttpService) {}

  async queryTracking(dto: QueryTrackingDto) {
    const payload = this.buildPayload(dto);
    const formData = new URLSearchParams();

    Object.entries(payload).forEach(([key, value]) => {
      if (value) {
        formData.append(key, value);
      }
    });

    try {
      const response = await firstValueFrom(
        this.httpService.post(this.sswTrackingUrl, formData.toString(), {
          timeout: 15000,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          responseType: 'text',
        }),
      );

      return this.parseTrackingResponse(response);
    } catch (error: unknown) {
      const requestError = error as {
        code?: string;
        message?: string;
        response?: { status?: number; data?: unknown };
      };

      console.error('Erro ao consultar SSW:', {
        code: requestError.code,
        message: requestError.message,
        status: requestError.response?.status,
        data: requestError.response?.data,
      });

      if (requestError.code === 'ECONNABORTED') {
        throw new GatewayTimeoutException(
          'Tempo limite excedido ao consultar rastreamento na SSW.',
        );
      }

      if (requestError.response) {
        throw new ServiceUnavailableException({
          message: 'Erro retornado pela API da SSW.',
          statusCode: requestError.response.status,
          data: requestError.response.data,
        });
      }

      throw new ServiceUnavailableException(
        'Nao foi possivel consultar o rastreamento na SSW.',
      );
    }
  }

  private buildPayload(dto: QueryTrackingDto): Record<string, string> {
    const payload: Record<string, string> = {
      cnpj: dto.cnpj.replace(/\D/g, ''),
      [dto.tipoConsulta]: dto.valor.trim(),
    };

    const senha = dto.senha?.trim();
    const siglaEmp = dto.siglaEmp?.trim();

    if (senha) {
      payload.senha = senha;
    }

    if (siglaEmp) {
      payload.sigla_emp = siglaEmp;
    }

    const consultationFieldCount = [
      payload.nro_nf,
      payload.pedido,
      payload.chave_nfe,
      payload.nro_coleta,
    ].filter(Boolean).length;

    if (consultationFieldCount !== 1) {
      throw new BadRequestException(
        'Envie exatamente um tipo de consulta valido.',
      );
    }

    if (payload.cnpj.length !== 14) {
      throw new BadRequestException('Informe um CNPJ valido com 14 digitos.');
    }

    return payload;
  }

  private parseTrackingResponse(
    response: AxiosResponse<unknown>,
  ): ParsedTrackingResponse {
    if (response.data && typeof response.data === 'object') {
      return response.data as ParsedTrackingResponse;
    }

    const responseText =
      typeof response.data === 'string' ? response.data.trim() : '';

    if (!responseText) {
      return this.emptyTrackingResponse(
        'A API da SSW retornou uma resposta vazia.',
      );
    }

    if (responseText.startsWith('{') || responseText.startsWith('[')) {
      return JSON.parse(responseText) as ParsedTrackingResponse;
    }

    if (responseText.startsWith('<')) {
      const parser = new XMLParser({
        ignoreAttributes: false,
        trimValues: true,
      });

      return parser.parse(responseText) as ParsedTrackingResponse;
    }

    return this.emptyTrackingResponse(responseText);
  }

  private emptyTrackingResponse(message: string): ParsedTrackingResponse {
    return {
      success: false,
      message,
      tracking: {
        items: {
          item: [],
        },
      },
    };
  }
}
