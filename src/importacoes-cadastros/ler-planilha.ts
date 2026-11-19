import { BadRequestException } from '@nestjs/common';
import { Workbook, type Cell, type Row, type Worksheet } from 'exceljs';
import { isEmail } from 'class-validator';
import { cnpjValido } from '../cnpj/cnpj.validation';
import { normalizarCnae, normalizarNomeSegmento } from '../segmentos/segmentos.catalogo';
import { validarPacoteXlsx } from './xlsx-limites';
import type { LinhaPlanilha } from './importacoes-cadastros.types';

export const chaveNome = (valor: string) => normalizarNomeSegmento(valor).replace(/\b(?:ltda|eireli|epp|s a)\b/g, '').replace(/\s+/g, ' ').trim();
export const etapaPlanilha = (valor: string) => ({ lead: 'entrada_leads', prospects: 'conversao', oportunidade: 'homologacao', negociacao: 'cotacao', perdido: 'perdido', declinado: 'perdido' }[normalizarNomeSegmento(valor)] ?? null);

function textoValor(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('formula' in value || 'sharedFormula' in value) return '';
    if ('richText' in value && Array.isArray(value.richText)) return value.richText.map(item => textoValor(item)).join('');
    if ('text' in value) return textoValor(value.text);
    return '';
  }
  return String(value);
}
function texto(cell: Cell) {
  return (cell.value instanceof Date ? cell.text : textoValor(cell.value)).trim();
}
function cabecalho(aba: Worksheet) {
  const mapa = new Map<string, number>();
  aba.getRow(1).eachCell((cell, coluna) => mapa.set(normalizarNomeSegmento(texto(cell)), coluna));
  return mapa;
}
function obter(row: Row, mapa: Map<string, number>, ...chaves: string[]) {
  const coluna = chaves.map(chave => mapa.get(chave)).find(Boolean);
  return coluna ? texto(row.getCell(coluna)) : '';
}
function site(valor: string) {
  try { const url = new URL(valor); return ['http:', 'https:'].includes(url.protocol) ? url.toString() : ''; }
  catch { return ''; }
}

export async function lerPlanilha(buffer: Buffer) {
  validarPacoteXlsx(buffer);
  const workbook = new Workbook();
  try { await workbook.xlsx.load(buffer as never); }
  catch { throw new BadRequestException('Não foi possível ler a planilha. Envie um arquivo XLSX válido.'); }
  if (workbook.worksheets.length > 12) throw new BadRequestException('A planilha deve ter até 12 abas.');
  const candidatas = workbook.worksheets.filter(aba => {
    const mapa = cabecalho(aba);
    return mapa.has('cliente') && (mapa.has('email') || mapa.has('telefone'));
  });
  if (candidatas.length !== 1) throw new BadRequestException('A planilha precisa de uma única aba principal com CLIENTE e EMAIL ou TELEFONE na primeira linha.');
  const aba = candidatas[0], mapa = cabecalho(aba);
  if (aba.rowCount > 10000) throw new BadRequestException('Remova as linhas excedentes; o limite é de 10 mil linhas, incluindo formatação.');
  const linhas: LinhaPlanilha[] = [];
  aba.eachRow((row, numero) => {
    if (numero === 1) return;
    const nome = obter(row, mapa, 'cliente');
    if (!nome) return; // rodapés e linhas apenas formatadas não são cadastros.
    const erros: string[] = [], avisos: string[] = [];
    const emailOriginal = obter(row, mapa, 'email', 'e mail');
    const emails = [...new Set((emailOriginal.match(/[A-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).filter(valor => isEmail(valor)).map(valor => valor.toLowerCase()))];
    if (emailOriginal && !emails.length) erros.push('E-mail inválido. Corrija na planilha e envie novamente.');
    if (emails.length > 1) avisos.push('Há vários e-mails; serão preservados como contatos separados.');
    const documentoOriginal = obter(row, mapa, 'cnpj', 'documento');
    const documento = documentoOriginal.replace(/[.\/\-\s]/g, '');
    if (documento && !cnpjValido(documento)) erros.push('CNPJ inválido.');
    const cnaeOriginal = obter(row, mapa, 'cnae');
    const cnae = normalizarCnae(cnaeOriginal);
    if (cnaeOriginal && !cnae) erros.push('CNAE inválido: informe sete dígitos.');
    for (const coluna of mapa.values()) {
      const valor = row.getCell(coluna).value;
      if (valor && typeof valor === 'object' && ('formula' in valor || 'sharedFormula' in valor)) erros.push('A linha contém fórmula; substitua por valores antes de importar.');
      if (valor && typeof valor === 'object' && 'error' in valor) erros.push('A linha contém erro do Excel; corrija a célula antes de importar.');
      if (typeof valor === 'number' && !Number.isFinite(valor)) erros.push('A linha contém um número inválido.');
      if (texto(row.getCell(coluna)).length > 16000) erros.push('Uma célula excede o limite de 16 mil caracteres.');
    }
    const telefone = obter(row, mapa, 'telefone');
    if (typeof row.getCell(mapa.get('telefone') || 1).value === 'number') avisos.push('Telefone numérico: confira possíveis zeros iniciais perdidos no Excel.');
    const siteOriginal = obter(row, mapa, 'site link', 'site', 'link');
    const siteUrl = site(siteOriginal);
    if (siteOriginal && !siteUrl) avisos.push('O link original será preservado no histórico, pois não é uma URL HTTP/HTTPS única.');
    if (nome.length > 250) erros.push('O nome da empresa deve ter até 250 caracteres.');
    linhas.push({ numero, nome, contato: obter(row, mapa, 'contato'), emailOriginal, emails, telefone, documento, cnae,
      funilOriginal: obter(row, mapa, 'funil'), segmentoOriginal: obter(row, mapa, 'segmentos', 'segmento'),
      notasMcg: obter(row, mapa, 'mcg'), notasPzt: obter(row, mapa, 'pzt'), retorno: obter(row, mapa, 'retorno cliente'),
      siteOriginal, siteUrl, prioridade: '', contatoPrioritario: '', papelContato: '', potencial: '', proximaAcao: '', erros: [...new Set(erros)], avisos });
  });
  if (!linhas.length || linhas.length > 1000) throw new BadRequestException('A aba principal deve conter de 1 a 1.000 empresas.');
  const prioridades = workbook.worksheets.find(item => normalizarNomeSegmento(item.name) === 'prioridade');
  const prioridadesNaoAssociadas: Array<Record<string, string>> = [];
  if (prioridades) {
    const colunas = cabecalho(prioridades);
    prioridades.eachRow((row, numero) => {
      if (numero === 1) return;
      const empresa = obter(row, colunas, 'empresa');
      if (!empresa) return;
      const dados = { prioridade: obter(row, colunas, 'prioridade'), contatoPrioritario: obter(row, colunas, 'contato principal'), papelContato: obter(row, colunas, 'papel provavel'), potencial: obter(row, colunas, 'potencial'), proximaAcao: obter(row, colunas, 'proxima acao') };
      const encontradas = linhas.filter(item => chaveNome(item.nome) === chaveNome(empresa));
      if (encontradas.length === 1) Object.assign(encontradas[0], dados);
      else prioridadesNaoAssociadas.push({ empresa, ...dados });
    });
  }
  if (Buffer.byteLength(JSON.stringify(linhas), 'utf8') > 3 * 1024 * 1024) throw new BadRequestException('Os dados da planilha excedem o limite de 3 MB.');
  return { aba: aba.name, linhas, prioridadesNaoAssociadas };
}
