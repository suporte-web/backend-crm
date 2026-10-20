import { extname } from 'node:path';

export const mimePlanilhas = {
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
} as const;

function possuiWorkbook(buffer: Buffer) {
  // Consulta o diretório do ZIP sem descompactar nem executar o conteúdo.
  for (
    let end = buffer.length - 22;
    end >= Math.max(0, buffer.length - 65557);
    end--
  ) {
    if (buffer.readUInt32LE(end) !== 0x06054b50) continue;
    if (end + 22 + buffer.readUInt16LE(end + 20) !== buffer.length) continue;
    const count = buffer.readUInt16LE(end + 10);
    const size = buffer.readUInt32LE(end + 12);
    let offset = buffer.readUInt32LE(end + 16);
    if (
      offset + size !== end ||
      buffer.readUInt16LE(end + 4) ||
      buffer.readUInt16LE(end + 6)
    )
      return false;
    const names = new Set<string>();
    for (let index = 0; index < count; index++) {
      if (offset + 46 > end || buffer.readUInt32LE(offset) !== 0x02014b50)
        return false;
      const length = buffer.readUInt16LE(offset + 28);
      const next =
        offset +
        46 +
        length +
        buffer.readUInt16LE(offset + 30) +
        buffer.readUInt16LE(offset + 32);
      const local = buffer.readUInt32LE(offset + 42);
      if (
        next > end ||
        local + 30 > end ||
        buffer.readUInt32LE(local) !== 0x04034b50
      )
        return false;
      names.add(buffer.toString('utf8', offset + 46, offset + 46 + length));
      offset = next;
    }
    return (
      offset === end &&
      ['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml'].every((name) =>
        names.has(name),
      )
    );
  }
  return false;
}

export function extensaoPlanilha(
  arquivo: Pick<Express.Multer.File, 'originalname' | 'mimetype' | 'buffer'>,
) {
  const extension = extname(arquivo.originalname).toLowerCase();
  const generic = ['', 'application/octet-stream', 'application/zip'].includes(
    arquivo.mimetype,
  );
  if (
    extension === '.xls' &&
    (generic || arquivo.mimetype === mimePlanilhas.xls) &&
    arquivo.buffer.length >= 512 &&
    arquivo.buffer.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex'))
  )
    return 'xls';
  if (
    extension === '.xlsx' &&
    (generic || arquivo.mimetype === mimePlanilhas.xlsx) &&
    arquivo.buffer.length >= 22 &&
    possuiWorkbook(arquivo.buffer)
  )
    return 'xlsx';
  return null;
}
