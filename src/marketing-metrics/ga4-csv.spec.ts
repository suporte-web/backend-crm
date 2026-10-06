import { parseGa4Csv } from './ga4-csv';

describe('GA4 CSV import', () => {
  it('preserves dimension values beginning with # after the header', () => {
    expect(
      parseGa4Csv('# Property: Site\nPage,Views\n#Campaign,120\nHome,2').rows,
    ).toEqual([
      ['#Campaign', '120'],
      ['Home', '2'],
    ]);
  });
  it('detects delimiters outside quoted header values', () => {
    expect(parseGa4Csv('"Campaign; label",Views\nHome,2').columns).toEqual([
      'Campaign; label',
      'Views',
    ]);
  });
  it('reads GA4 metadata, quoted commas, escaped quotes and CRLF without changing metrics', () => {
    const csv =
      '\uFEFF# Property: Site\r\n# Start date: 20260901\r\n\r\nPage title,Views,Total users\r\n"Home, Site",120,75\r\n"Página ""Contato""",30,22\r\n';
    expect(parseGa4Csv(csv)).toEqual({
      columns: ['Page title', 'Views', 'Total users'],
      rows: [
        ['Home, Site', '120', '75'],
        ['Página "Contato"', '30', '22'],
      ],
    });
  });
  it('preserves decimal commas and multiline cells in semicolon exports', () => {
    expect(parseGa4Csv('Página;Taxa\n"Linha 1\nLinha 2";"12,5%"')).toEqual({
      columns: ['Página', 'Taxa'],
      rows: [['Linha 1\nLinha 2', '12,5%']],
    });
  });
  it.each([
    '',
    'Página,Views',
    'Página,Views\nHome,2,3',
    'Página,Views\n"Home,2',
    '<html>erro</html>',
    'Página,,Views\nHome,2,3',
  ])('rejects invalid or empty tables: %s', (csv) => {
    expect(() => parseGa4Csv(csv)).toThrow();
  });
  it('rejects exports with multiple table sections rather than merging incompatible metrics', () => {
    expect(() =>
      parseGa4Csv(
        'Página,Views\nHome,2\n\n# Second table\nDate,Users,Sessions\n20260901,2,4',
      ),
    ).toThrow();
  });
  it('rejects a report exceeding the row limit instead of silently truncating it', () => {
    expect(() =>
      parseGa4Csv('Página,Views\n' + 'Home,1\n'.repeat(5001)),
    ).toThrow();
  });
});
