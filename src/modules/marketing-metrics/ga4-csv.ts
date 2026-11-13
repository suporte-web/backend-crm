import { BadRequestException } from '@nestjs/common';

// Keep exported values verbatim: GA4 users and rates cannot be summed safely.
export function parseGa4Csv(text: string): {
  columns: string[];
  rows: string[][];
} {
  const invalid = (message: string): never => {
    throw new BadRequestException(message);
  };
  text = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  if (text.includes('\u0000') || text.includes('\uFFFD'))
    invalid('Exporte o relatório como CSV em UTF-8.');
  const first =
    text
      .split('\n')
      .find((line) => line.trim() && !line.trimStart().startsWith('#')) ?? '';
  let inHeaderQuotes = false,
    commas = 0,
    semicolons = 0;
  for (const char of first) {
    if (char === '"') inHeaderQuotes = !inHeaderQuotes;
    else if (!inHeaderQuotes && char === ',') commas++;
    else if (!inHeaderQuotes && char === ';') semicolons++;
  }
  const delimiter = semicolons > commas ? ';' : ',';
  const records: string[][] = [];
  let row: string[] = [],
    cell = '',
    quoted = false,
    closed = false,
    sectionEnded = false;
  const finish = () => {
    row.push(cell);
    if (row.some((value) => value.trim())) {
      if (sectionEnded)
        invalid(
          'O CSV contém mais de uma tabela. Exporte um relatório por arquivo.',
        );
      records.push(row);
      if (records.length > 5001)
        invalid('O relatório excede 5.000 linhas. Exporte um período menor.');
    } else if (records.length > 1) sectionEnded = true;
    row = [];
    cell = '';
    closed = false;
  };
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (
      !quoted &&
      !cell &&
      !row.length &&
      (i === 0 || text[i - 1] === '\n') &&
      char === '#' &&
      (!records.length ||
        !text
          .slice(
            i,
            text.indexOf('\n', i) === -1 ? text.length : text.indexOf('\n', i),
          )
          .includes(delimiter))
    ) {
      while (i < text.length && text[i] !== '\n') i++;
      continue;
    }
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += char;
    } else if (char === delimiter) {
      row.push(cell);
      cell = '';
      closed = false;
    } else if (char === '\n') finish();
    else if (char === '"') {
      if (cell || closed)
        invalid('Aspas inválidas no CSV. Exporte novamente pelo GA4.');
      quoted = true;
    } else {
      if (closed) invalid('Conteúdo inválido após aspas no CSV.');
      cell += char;
    }
  }
  if (quoted) invalid('O CSV possui aspas não fechadas.');
  if (cell || row.length) finish();
  const columns = (records.shift() ?? []).map((value) => value.trim());
  if (
    columns.length < 2 ||
    columns.length > 50 ||
    columns.some((value) => !value) ||
    new Set(columns).size !== columns.length
  )
    invalid(
      'O CSV precisa de um cabeçalho válido com 2 a 50 colunas distintas.',
    );
  if (!records.length) invalid('O CSV não contém dados.');
  if (
    records.some(
      (record) =>
        record.length !== columns.length ||
        record.every((value, index) => value.trim() === columns[index]),
    )
  )
    invalid(
      'O CSV contém linhas incompatíveis ou mais de uma tabela. Exporte um relatório por arquivo.',
    );
  return { columns, rows: records };
}
