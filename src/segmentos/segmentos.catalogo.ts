// Classificação comercial do CRM. Os prefixos seguem a hierarquia CNAE/CONCLA;
// a correspondência comercial pode ser administrada no catálogo do banco.
// Fontes: https://cnae.ibge.gov.br/documentacao.html e notas explicativas da CNAE 2.0.
export const segmentosIniciais = [
  ['alimentos', 'Alimentos', ['IND ALIMENTOS', 'DISTRIB ALIMENTOS'], ['10']],
  ['bebidas', 'Bebidas', ['IND BEBIDAS'], ['11']],
  ['farmaceutico', 'Farmacêutico', ['Fármaco', 'IND FARMACEUTICA', 'VAREJO FARMACEUTICO', 'DISTRIB MEDICAMENTOS', 'IND PET MEDICAMENTOS'], ['21', '46443', '47717']],
  ['farmoquimico', 'Farmoquímico', ['FARMOQUIMICA', 'IND FARMOQUIMICO'], ['211']],
  ['quimico', 'Químico', ['IND QUIMICA', 'IND AGROQUIMICO'], ['20']],
  ['higiene-limpeza', 'Higiene e limpeza', ['Higiene/Limpeza', 'IND HIGIENE LIMPEZA'], ['20614', '20622']],
  ['cosmeticos', 'Cosméticos e higiene pessoal', ['Cosmético/Perfumaria', 'IND HPPC', 'VAREJO HPPC', 'IND PET HPPC'], ['20631']],
  ['embalagens', 'Embalagens', ['Embalagem', 'IND EMBALAGENS'], []],
  ['automotivo', 'Automotivo', ['IND PNEUS'], ['29', '45']],
  ['varejo', 'Varejo', ['VAREJO ESPORTIVO', 'LOJAS DE CONVENIENCIA'], ['47']],
  ['atacado', 'Atacado e distribuição', ['Distribuição', 'DISTRIB ELETRONICOS'], ['46']],
  ['supermercados', 'Supermercados', ['Supermercado'], ['47113']],
  ['ecommerce', 'E-commerce', ['E commerce', 'Comércio eletrônico'], []],
  ['bens-consumo', 'Bens de consumo', ['Bens de Consumo'], []],
  ['pet', 'Pet', ['IND PET ALIMENTOS ACESS', 'VAREJO PET'], []],
  ['saude-correlatos', 'Saúde e correlatos', ['Fármaco Correlatos', 'IND DE CORRELATOS', 'IND EPI S', 'IND ODONTOLOGICA', 'LAB ANALISES CLINICAS'], ['86']],
  ['insumos', 'Insumos', [], []],
  ['textil', 'Têxtil e vestuário', ['Têxteis', 'IND TEXTIL'], ['13', '14']],
  ['papel', 'Papel e celulose', [], ['17']],
  ['grafico', 'Gráficas e editoras', ['GRAFICAS EDITORAS'], ['18', '58']],
  ['eletronicos', 'Eletrônicos e equipamentos', ['IND ELETRONICOS', 'IND ELETROELETRONICOS'], ['26', '27']],
  ['borracha-plastico', 'Borracha e plástico', [], ['22']],
  ['construcao', 'Construção', [], ['41', '42', '43']],
  ['transporte-logistica', 'Transporte e logística', ['PORTOS', 'AEROPORTOS', 'SUBCONTRATADOS'], ['49', '50', '51', '52', '53']],
  ['agro', 'Agropecuária', [], ['01', '02', '03']],
  ['servicos', 'Serviços', [], ['62', '63', '69', '70', '71', '73', '74', '77', '78', '79', '80', '81', '82']],
  ['governo', 'Administração pública', ['GOVERNO'], ['84']],
] as const;

export function normalizarNomeSegmento(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
    .replace(/^\s*\d+\s*[-–]\s*/, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

export function normalizarCnae(valor?: string | null) {
  if (!valor?.trim()) return '';
  const codigo = valor.trim().replace(/[.\/\-\s]/g, '');
  return /^\d{7}$/.test(codigo) ? codigo : '';
}
