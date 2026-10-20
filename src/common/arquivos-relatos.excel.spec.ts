import { BadRequestException } from '@nestjs/common';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  guardarArquivoRelato,
  lerArquivoRelato,
  validarArquivoRelato,
} from './arquivos-relatos';

// ZIP mínimo com entradas de um workbook; não depende de arquivos do usuário.
function workbook(
  names = ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml'],
) {
  const local = names.map((name) => {
    const header = Buffer.alloc(30);
    header.writeUInt32LE(0x04034b50);
    header.writeUInt16LE(Buffer.byteLength(name), 26);
    return Buffer.concat([header, Buffer.from(name)]);
  });
  let offset = 0;
  const directory = names.map((name, index) => {
    const header = Buffer.alloc(46);
    header.writeUInt32LE(0x02014b50);
    header.writeUInt16LE(Buffer.byteLength(name), 28);
    header.writeUInt32LE(offset, 42);
    offset += local[index].length;
    return Buffer.concat([header, Buffer.from(name)]);
  });
  const central = Buffer.concat(directory);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(names.length, 8);
  end.writeUInt16LE(names.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...local, central, end]);
}
function file(name: string, mime: string, buffer: Buffer): Express.Multer.File {
  return {
    originalname: name,
    mimetype: mime,
    buffer,
    size: buffer.length,
    fieldname: 'arquivo',
    encoding: '7bit',
    destination: '',
    filename: '',
    path: '',
    stream: require('node:stream').Readable.from(buffer),
  };
}
const xlsxMime =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
describe('Anexos Excel', () => {
  it('aceita XLS com assinatura OLE e XLSX com estrutura de workbook', () => {
    const xls = Buffer.alloc(512);
    Buffer.from('d0cf11e0a1b11ae1', 'hex').copy(xls);
    expect(
      validarArquivoRelato(
        file('planilha.xls', 'application/vnd.ms-excel', xls),
      ),
    ).toBe('xls');
    expect(
      validarArquivoRelato(file('planilha.xlsx', xlsxMime, workbook())),
    ).toBe('xlsx');
  });
  it('aceita MIME genérico de navegador para Excel identificado pelo conteúdo', () => {
    expect(
      validarArquivoRelato(
        file('PLANILHA.XLSX', 'application/octet-stream', workbook()),
      ),
    ).toBe('xlsx');
  });
  it('rejeita ZIP comum, conteúdo falsificado e extensão incompatível', () => {
    for (const attachment of [
      file('teste.xlsx', xlsxMime, workbook(['documento.txt'])),
      file('teste.xlsx', xlsxMime, Buffer.from('arquivo falso')),
      file('teste.xls', 'application/vnd.ms-excel', workbook()),
    ]) {
      expect(() => validarArquivoRelato(attachment)).toThrow(
        BadRequestException,
      );
    }
  });
  it('mantém o limite de tamanho', () => {
    expect(() =>
      validarArquivoRelato({
        ...file('teste.xlsx', xlsxMime, workbook()),
        size: 10 * 1024 * 1024 + 1,
      }),
    ).toThrow(BadRequestException);
  });
  it('salva com MIME Excel e baixa novamente sem alterar o conteúdo', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'crm-excel-'));
    try {
      const buffer = workbook();
      const saved = await guardarArquivoRelato(
        directory,
        file('orcamento.xlsx', 'application/octet-stream', buffer),
      );
      expect(saved.tipo).toBe(xlsxMime);
      expect(await lerArquivoRelato(directory, saved.arquivo)).toEqual(buffer);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
