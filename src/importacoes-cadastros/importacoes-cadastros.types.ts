export type LinhaPlanilha = {
  numero: number; nome: string; contato: string; emailOriginal: string; emails: string[]; telefone: string;
  documento: string; cnae: string; funilOriginal: string; segmentoOriginal: string;
  notasMcg: string; notasPzt: string; retorno: string; siteOriginal: string; siteUrl: string;
  prioridade: string; contatoPrioritario: string; papelContato: string; potencial: string; proximaAcao: string;
  erros: string[]; avisos: string[];
};
export type LinhaPrevia = LinhaPlanilha & {
  etapaSugerida: string | null; segmentoId: string | null; segmentoNome: string | null;
  segmentoPorCnae: boolean;
  duplicidades: Array<{ id?: string; nome: string; motivo: string }>;
  selecionavel: boolean;
};
