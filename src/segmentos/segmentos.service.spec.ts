import { BadRequestException } from '@nestjs/common';
import { classificarCnae, resolverSegmentoCadastro } from './segmentos.service';
import { normalizarCnae } from './segmentos.catalogo';

describe('Segmentação centralizada', () => {
  const quimico = { id: 'q', nome: 'Químico', ativo: true, aliases: ['IND QUIMICA'] };
  const cosmetico = { id: 'c', nome: 'Cosméticos', ativo: true, aliases: [] };
  function banco() {
    return {
      regraSegmentoCnae: { findMany: jest.fn().mockResolvedValue([{ prefixo: '20', segmento: quimico }, { prefixo: '20631', segmento: cosmetico }]) },
      segmento: { findMany: jest.fn().mockResolvedValue([quimico, cosmetico]), findUnique: jest.fn().mockResolvedValue(quimico) },
    };
  }
  it('preserva zeros iniciais e aceita somente CNAE completo', () => {
    expect(normalizarCnae('01.13-0/00')).toBe('0113000');
    expect(normalizarCnae('2063100')).toBe('2063100');
    expect(normalizarCnae('03 - IND HPPC')).toBe('');
  });
  it('prefere a regra específica à divisão genérica', async () => {
    const db = banco();
    expect(await classificarCnae(db as never, '2063-1/00')).toEqual({ id: 'c', nome: 'Cosméticos', prefixo: '20631' });
    expect(db.regraSegmentoCnae.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ ativa: true, segmento: { ativo: true } }) }));
  });
  it('não inventa classificação quando não há regra', async () => {
    const db = banco(); db.regraSegmentoCnae.findMany.mockResolvedValue([]);
    expect(await classificarCnae(db as never, '9999999')).toBeNull();
  });
  it('preserva escolha manual mesmo quando o CNAE muda', async () => {
    const db = banco();
    expect(await resolverSegmentoCadastro(db as never, { cnae: '2063100' }, { cnae: '2011800', segmentoId: 'q', segment: 'Químico', segmentoOrigem: 'MANUAL' })).toEqual({ cnae: '2063100' });
    expect(db.regraSegmentoCnae.findMany).not.toHaveBeenCalled();
  });
  it('reclassifica quando solicitado explicitamente', async () => {
    expect(await resolverSegmentoCadastro(banco() as never, { cnae: '2063100', segmentoAutomatico: true }, { segment: 'Legado', segmentoOrigem: 'LEGADO' })).toMatchObject({ segmentoId: 'c', segment: 'Cosméticos', segmentoOrigem: 'CNAE' });
  });
  it('normaliza sinônimos importados sem espalhar textos livres', async () => {
    expect(await resolverSegmentoCadastro(banco() as never, { segment: '  IND. QUÍMICA ', segmentoAutomatico: false }, undefined, 'IMPORTACAO')).toMatchObject({ segmentoId: 'q', segment: 'Químico', segmentoOrigem: 'IMPORTACAO' });
  });
  it('conserva valor legado inalterado e rejeita novo texto fora do catálogo', async () => {
    const db = banco();
    expect(await resolverSegmentoCadastro(db as never, { segment: 'Texto antigo' }, { segment: 'Texto antigo', segmentoOrigem: 'LEGADO' })).toEqual({});
    await expect(resolverSegmentoCadastro(db as never, { segment: 'Categoria inventada' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
