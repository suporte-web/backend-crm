import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { inflateRawSync } from 'node:zlib';

export const MAX_ARQUIVO = 5 * 1024 * 1024;
const MAX_EXPANDIDO = 32 * 1024 * 1024;

/** Confere também o tamanho realmente descompactado, antes de carregar o ExcelJS. */
export function validarPacoteXlsx(buffer: Buffer) {
  if (buffer.length > MAX_ARQUIVO) throw new PayloadTooLargeException('A planilha deve ter até 5 MB.');
  const invalido = () => new BadRequestException('Arquivo XLSX inválido, protegido ou não suportado.');
  if (buffer.length < 22 || buffer.readUInt32LE(0) !== 0x04034b50) throw invalido();
  let fim = buffer.length - 22;
  while (fim >= Math.max(0, buffer.length - 65557)) {
    if (buffer.readUInt32LE(fim) === 0x06054b50 && fim + 22 + buffer.readUInt16LE(fim + 20) === buffer.length) break;
    fim--;
  }
  if (fim < Math.max(0, buffer.length - 65557)) throw invalido();
  const quantidade = buffer.readUInt16LE(fim + 10);
  if (buffer.readUInt16LE(fim + 4) || buffer.readUInt16LE(fim + 6) || quantidade !== buffer.readUInt16LE(fim + 8) || quantidade > 300) throw invalido();
  let posicao = buffer.readUInt32LE(fim + 16), total = 0, celulas = 0;
  const nomes = new Set<string>();
  try {
    for (let i = 0; i < quantidade; i++) {
      if (posicao + 46 > fim || buffer.readUInt32LE(posicao) !== 0x02014b50) throw invalido();
      const flags = buffer.readUInt16LE(posicao + 8), metodo = buffer.readUInt16LE(posicao + 10);
      const comprimido = buffer.readUInt32LE(posicao + 20), declarado = buffer.readUInt32LE(posicao + 24);
      const tamanhoNome = buffer.readUInt16LE(posicao + 28), extra = buffer.readUInt16LE(posicao + 30), comentario = buffer.readUInt16LE(posicao + 32);
      const local = buffer.readUInt32LE(posicao + 42);
      const nome = buffer.subarray(posicao + 46, posicao + 46 + tamanhoNome).toString('utf8');
      if ((flags & 1) || ![0, 8].includes(metodo) || declarado > MAX_EXPANDIDO - total || nomes.has(nome) || nome.includes('..') || nome.startsWith('/') || nome.includes('\\')) throw invalido();
      nomes.add(nome);
      if (local + 30 > posicao || buffer.readUInt32LE(local) !== 0x04034b50) throw invalido();
      const inicio = local + 30 + buffer.readUInt16LE(local + 26) + buffer.readUInt16LE(local + 28);
      if (inicio + comprimido > posicao) throw invalido();
      const dados = buffer.subarray(inicio, inicio + comprimido);
      const conteudo = metodo === 0 ? dados : inflateRawSync(dados, { maxOutputLength: MAX_EXPANDIDO - total + 1 });
      if (conteudo.length !== declarado) throw invalido();
      total += conteudo.length;
      if (total > MAX_EXPANDIDO) throw new PayloadTooLargeException('A planilha descompactada excede o limite.');
      if (/^xl\/worksheets\/sheet\d+\.xml$/.test(nome)) celulas += (conteudo.toString('utf8').match(/<c(?:\s|>)/g) || []).length;
      if (celulas > 200000) throw new PayloadTooLargeException('A planilha contém células demais.');
      posicao += 46 + tamanhoNome + extra + comentario;
    }
  } catch (erro) {
    if (erro instanceof BadRequestException || erro instanceof PayloadTooLargeException) throw erro;
    throw invalido();
  }
  if (!nomes.has('xl/workbook.xml') || !nomes.has('[Content_Types].xml')) throw invalido();
}
