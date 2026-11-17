import { BadRequestException } from '@nestjs/common';

/** Fonte única das categorias; textos livres nunca participam da classificação. */
export const MOTIVOS_PERDA = [
  {
    codigo: 'PRECO_CONDICOES',
    rotulo: 'Preço/condições comerciais não competitivas',
    exigeObservacao: false,
  },
  {
    codigo: 'CONCORRENTE',
    rotulo: 'Concorrente escolhido',
    exigeObservacao: false,
  },
  {
    codigo: 'ROTA_COBERTURA',
    rotulo: 'Rota ou cobertura logística incompatível',
    exigeObservacao: false,
  },
  {
    codigo: 'LIMITACAO_OPERACIONAL',
    rotulo: 'Limitação operacional',
    exigeObservacao: true,
  },
  {
    codigo: 'REQUISITOS_NAO_ATENDIDOS',
    rotulo: 'Requisitos técnicos, documentação ou homologação não atendidos',
    exigeObservacao: false,
  },
  {
    codigo: 'CREDITO_PAGAMENTO',
    rotulo: 'Crédito ou condições de pagamento não aprovados',
    exigeObservacao: false,
  },
  {
    codigo: 'RENTABILIDADE_VOLUME',
    rotulo: 'Baixa rentabilidade ou volume insuficiente',
    exigeObservacao: false,
  },
  {
    codigo: 'PROJETO_ADIADO',
    rotulo: 'Projeto adiado, suspenso ou cancelado',
    exigeObservacao: false,
  },
  {
    codigo: 'DESISTENCIA_CLIENTE',
    rotulo: 'Desistência ou mudança de necessidade do cliente',
    exigeObservacao: false,
  },
  {
    codigo: 'FALTA_RETORNO',
    rotulo: 'Falta de retorno',
    exigeObservacao: false,
  },
  {
    codigo: 'FROTA_PROPRIA',
    rotulo: 'Opção por frota própria',
    exigeObservacao: false,
  },
  {
    codigo: 'DUPLICADA_INDEVIDA',
    rotulo: 'Oportunidade duplicada ou cadastro indevido',
    exigeObservacao: false,
  },
  {
    codigo: 'DECISAO_INTERNA',
    rotulo: 'Declinada por decisão interna (gerência/diretoria)',
    exigeObservacao: false,
  },
  { codigo: 'OUTRO', rotulo: 'Outro motivo', exigeObservacao: true },
] as const;

export type DadosPerda = {
  motivoPerda?: string | null;
  observacaoPerda?: string | null;
};
type PerdaAtual = {
  status?: string;
  lostReason?: string | null;
  motivoPerda?: string | null;
  observacaoPerda?: string | null;
};

export function resolverPerda(
  status: string,
  input: DadosPerda,
  anterior?: PerdaAtual,
) {
  if (status !== 'LOST')
    return { lostReason: null, motivoPerda: null, observacaoPerda: null };
  const raw =
    input.motivoPerda !== undefined
      ? input.motivoPerda
      : anterior?.status === 'LOST'
        ? anterior.motivoPerda
        : null;
  const reason =
    typeof raw === 'string'
      ? MOTIVOS_PERDA.find(
          (item) => item.codigo === raw.trim() || item.rotulo === raw.trim(),
        )
      : undefined;
  if (!reason)
    throw new BadRequestException(
      'Selecione um motivo da perda válido antes de salvar a oportunidade perdida.',
    );
  const rawNotes =
    input.observacaoPerda !== undefined
      ? input.observacaoPerda
      : anterior?.status === 'LOST'
        ? anterior.observacaoPerda
        : null;
  if (
    rawNotes !== null &&
    rawNotes !== undefined &&
    typeof rawNotes !== 'string'
  )
    throw new BadRequestException('Informe uma observação da perda válida.');
  const notes = rawNotes?.trim() || null;
  if (reason.exigeObservacao && !notes)
    throw new BadRequestException(
      reason.codigo === 'LIMITACAO_OPERACIONAL'
        ? 'Descreva a limitação operacional identificada (capacidade, veículos, prazo, armazenagem ou outra limitação).'
        : 'Descreva o outro motivo da perda.',
    );
  if (notes && notes.length > 2000)
    throw new BadRequestException(
      'As observações da perda devem ter no máximo 2000 caracteres.',
    );
  return {
    lostReason: reason.rotulo,
    motivoPerda: reason.codigo,
    observacaoPerda: notes,
  };
}

export function historicoPerda(
  anterior: PerdaAtual | null,
  proxima: PerdaAtual,
) {
  return {
    textoPerdaAnterior: anterior?.lostReason ?? null,
    motivoPerdaAnterior: anterior?.motivoPerda ?? null,
    observacaoPerdaAnterior: anterior?.observacaoPerda ?? null,
    lostReason: proxima.lostReason ?? null,
    motivoPerda: proxima.motivoPerda ?? null,
    observacaoPerda: proxima.observacaoPerda ?? null,
  };
}
export function descricaoPerda(perda: PerdaAtual) {
  return perda.motivoPerda
    ? ' Motivo: ' +
        perda.lostReason +
        '.' +
        (perda.observacaoPerda ? ' Observações: ' + perda.observacaoPerda : '')
    : '';
}
