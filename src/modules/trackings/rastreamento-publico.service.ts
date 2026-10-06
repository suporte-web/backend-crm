import { BadGatewayException, BadRequestException, GatewayTimeoutException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TrackingsService } from './trackings.service';
import { ConsultaRastreamentoPublicoDto } from './dto/consulta-rastreamento-publico.dto';
import { TrackingQueryType } from './dto/query-tracking.dto';

function objeto(valor: unknown): Record<string, unknown> {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Record<string, unknown> : {};
}

function texto(valor: unknown): string | null {
  if (typeof valor !== 'string' && typeof valor !== 'number') return null;
  return String(valor).replace(/<[^>]*>/g, '').replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, 1000) || null;
}

function campo(fontes: Record<string, unknown>[], chaves: string[]) {
  for (const fonte of fontes) for (const chave of chaves) {
    const valor = texto(fonte[chave]);
    if (valor) return valor;
  }
  return null;
}

function instante(valor: string | null): number | null {
  if (!valor) return null;
  const brasileiro = valor.match(/^(\d{2})[/-](\d{2})[/-](\d{4}|\d{2})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?$/);
  const normalizado = brasileiro
    ? `${brasileiro[3].length === 2 ? '20' : ''}${brasileiro[3]}-${brasileiro[2]}-${brasileiro[1]}T${brasileiro[4] ?? '00'}:${brasileiro[5] ?? '00'}:${brasileiro[6] ?? '00'}`
    : valor;
  const resultado = Date.parse(normalizado);
  return Number.isFinite(resultado) ? resultado : null;
}

// Adaptador de apresentação: a chamada à SSW continua exclusivamente no TrackingsService.
@Injectable()
export class RastreamentoPublicoService {
  constructor(private readonly trackings: TrackingsService, private readonly config: ConfigService) {}

  async consultar(valor: string, consulta: ConsultaRastreamentoPublicoDto) {
    const codigo = typeof valor === 'string' ? valor.trim() : '';
    const cnpj = typeof consulta.cnpj === 'string' ? consulta.cnpj.replace(/[./\-\s]/g, '') : '';
    const tipo = consulta.tipo ?? TrackingQueryType.NRO_NF;
    if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]{0,79}$/.test(codigo) || !/^\d{14}$/.test(cnpj)
      || !Object.values(TrackingQueryType).includes(tipo)
      || (tipo === TrackingQueryType.CHAVE_NFE && !/^\d{44}$/.test(codigo))) {
      throw new BadRequestException('Informe CNPJ, tipo de consulta e código válidos.');
    }
    let resposta: Record<string, unknown>;
    try {
      resposta = objeto(await this.trackings.queryTracking({
        cnpj, tipoConsulta: tipo, valor: codigo,
        senha: this.config.get<string>('SSW_TRACKING_PASSWORD')?.trim() || undefined,
        siglaEmp: this.config.get<string>('SSW_TRACKING_COMPANY')?.trim() || undefined,
      }));
    } catch (erro) {
      if (erro instanceof GatewayTimeoutException) throw new GatewayTimeoutException('A consulta demorou mais que o esperado. Tente novamente.');
      // Nunca repassar corpo, credenciais ou mensagem técnica da integração ao site.
      throw new BadGatewayException('Não foi possível consultar o rastreamento. Tente novamente.');
    }
    const tracking = objeto(resposta.tracking);
    const bruto = Array.isArray(resposta.tracking) ? resposta.tracking : objeto(tracking.items).item;
    const itens = (Array.isArray(bruto) ? bruto : bruto ? [bruto] : []).map(objeto);
    const fontes = [objeto(tracking.header), objeto(resposta.header), tracking, resposta];
    const eventos = itens.map(item => ({
      dataHora: texto(item.data_hora_efetiva) ?? texto(item.data_hora),
      ocorrencia: texto(item.ocorrencia) ?? texto(item.tipo) ?? 'Movimentação registrada',
      descricao: texto(item.descricao),
      local: [texto(item.cidade), texto(item.filial)].filter(Boolean).join(' • ') || null,
    }));
    // Só ordenar quando todas as datas forem reconhecidas; caso contrário preservar a ordem da fonte.
    if (eventos.every(evento => instante(evento.dataHora) !== null)) {
      eventos.sort((a, b) => instante(a.dataHora)! - instante(b.dataHora)!);
    }
    const documento = campo(fontes, ['documento_transporte', 'documentoTransporte', 'nro_cte', 'nr_cte', 'cte', 'conhecimento', 'nro_documento']);
    const sucesso = tracking.success ?? resposta.success;
    if (sucesso === false || sucesso === 'false' || (!eventos.length && !documento)) {
      throw new NotFoundException('Nenhuma carga encontrada para os dados informados.');
    }
    const previsao = campo(fontes, ['previsao_entrega', 'previsaoEntrega', 'data_previsao_entrega', 'dataPrevistaEntrega', 'entrega_prevista', 'prazo_entrega', 'prazoEntrega', 'previsao'])
      ?? [...eventos].reverse().map(evento => evento.descricao?.match(/previs[aã]o de entrega:\s*(\d{2}\/\d{2}\/\d{2,4})/i)?.[1]).find(Boolean) ?? null;
    return {
      codigo,
      status: eventos[eventos.length - 1]?.ocorrencia ?? 'Sem movimentações',
      origem: campo(fontes, ['cidade_origem', 'cidadeOrigem', 'origem', 'cidade_remetente']),
      destino: campo(fontes, ['cidade_destino', 'cidadeDestino', 'destino', 'cidade_entrega', 'cidadeEntrega']),
      previsaoEntrega: previsao,
      documento,
      eventos,
    };
  }
}
