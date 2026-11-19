import { Workbook } from 'exceljs';
import { BadRequestException } from '@nestjs/common';
import { lerPlanilha, etapaPlanilha } from './ler-planilha';
import { validarPacoteXlsx } from './xlsx-limites';

async function arquivo(alterar?: (w: Workbook) => void) {
  const w = new Workbook(), aba = w.addWorksheet('CLIENTES MCG_PZT');
  aba.addRow(['QT', 'FUNIL', 'CLIENTE', 'CONTATO', 'EMAIL', 'TELEFONE', 'SEGMENTOS', 'MCG', 'PZT', 'RETORNO CLIENTE', 'SITE / LINK']);
  aba.addRow([1, 'LEAD', 'Empresa Azul', 'Contato A', 'a@example.test; b@example.test', 8003100002, 'IND. QUÍMICA', '01/02 - nota original', 'Nota PZT', 'Retorno', 'https://example.test/cadastro']);
  aba.getRow(1000).getCell(1).value = 999;
  const prioridade = w.addWorksheet('PRIORIDADE');
  prioridade.addRow(['Prioridade', 'Empresa', 'Contato principal', 'Papel provável', 'Potencial', 'Próxima ação']);
  prioridade.addRow([1, 'Empresa Azul', '', 'Decisor', 'Alto', 'Ligar']);
  prioridade.addRow([2, 'Empresa sem correspondência', '', '', '', 'Conferir']);
  w.addWorksheet('METAS').addRow(['Não importar como empresa']);
  alterar?.(w);
  return Buffer.from(await w.xlsx.writeBuffer());
}
describe('Leitura de XLSX para cadastros', () => {
  it('lê apenas empresas da aba principal e preserva as informações de origem', async () => {
    const resultado = await lerPlanilha(await arquivo());
    expect(resultado.linhas).toHaveLength(1);
    expect(resultado.linhas[0]).toMatchObject({ numero: 2, nome: 'Empresa Azul', notasMcg: '01/02 - nota original', notasPzt: 'Nota PZT', retorno: 'Retorno', emails: ['a@example.test', 'b@example.test'], telefone: '8003100002', proximaAcao: 'Ligar', prioridade: '1' });
    expect(resultado.linhas[0].avisos.join(' ')).toContain('zeros iniciais');
    expect(resultado.prioridadesNaoAssociadas).toHaveLength(1);
  });
  it('não presume etapa para nutrição nem para o nome da transportadora', () => {
    expect(etapaPlanilha('LEAD')).toBe('entrada_leads');
    expect(etapaPlanilha('NUTRIÇÃO')).toBeNull();
    expect(etapaPlanilha('PIZZATTOLOG')).toBeNull();
  });
  it('bloqueia linha com fórmula ou e-mail inválido', async () => {
    const resultado = await lerPlanilha(await arquivo(w => {
      w.worksheets[0].getCell('E2').value = 'e-mail inválido';
      w.worksheets[0].getCell('H2').value = { formula: '1+1', result: 2 };
    }));
    expect(resultado.linhas[0].erros).toEqual(expect.arrayContaining([expect.stringContaining('E-mail'), expect.stringContaining('fórmula')]));
  });
  it('preserva emails em hyperlink com texto formatado do Excel', async () => {
    const resultado = await lerPlanilha(await arquivo(w => {
      w.worksheets[0].getCell('E2').value = {
        text: { richText: [
          { font: { underline: true }, text: 'contato@example.test / compras@example.test / ' },
          { text: 'rh@example.test / logistica@example.test' },
        ] },
        hyperlink: 'mailto:contato@example.test%20',
      } as never;
    }));
    expect(resultado.linhas[0].emails).toEqual(['contato@example.test', 'compras@example.test', 'rh@example.test', 'logistica@example.test']);
    expect(resultado.linhas[0].emailOriginal).not.toContain('[object Object]');
    expect(resultado.linhas[0].erros).toEqual([]);
  });
  it('rejeita arquivos que não são pacotes XLSX', async () => {
    expect(() => validarPacoteXlsx(Buffer.from('arquivo inválido'))).toThrow(BadRequestException);
    await expect(lerPlanilha(await arquivo(w => { w.worksheets[0].getCell('C1').value = 'Título errado'; }))).rejects.toThrow('aba principal');
  });
  it('recusa ZIP com tamanho expandido abusivo antes de descompactar', () => {
    const local = Buffer.alloc(30), central = Buffer.alloc(46), fim = Buffer.alloc(22);
    local.writeUInt32LE(0x04034b50, 0); central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt32LE(100 * 1024 * 1024, 24);
    fim.writeUInt32LE(0x06054b50, 0); fim.writeUInt16LE(1, 8); fim.writeUInt16LE(1, 10); fim.writeUInt32LE(30, 16);
    expect(() => validarPacoteXlsx(Buffer.concat([local, central, fim]))).toThrow();
  });
});
