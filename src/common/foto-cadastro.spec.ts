import { validarFotoCadastro } from './foto-cadastro';

describe('Foto do cadastro', () => {
  it('aceita PNG e remoção da foto', () => {
    expect(validarFotoCadastro('data:image/png;base64,iVBORw0KGgo=')).toBe(
      'data:image/png;base64,iVBORw0KGgo=',
    );
    expect(validarFotoCadastro('')).toBe('');
  });
  it('rejeita conteúdo que não corresponde a uma imagem', () => {
    expect(() => validarFotoCadastro('data:image/png;base64,dGV4dG8=')).toThrow(
      'imagem',
    );
    expect(() =>
      validarFotoCadastro('data:image/svg+xml;base64,dGV4dG8='),
    ).toThrow('imagem');
  });
  it('rejeita imagens acima de 1,5 MB', () => {
    expect(() =>
      validarFotoCadastro(
        'data:image/png;base64,' + Buffer.alloc(1572865).toString('base64'),
      ),
    ).toThrow('1,5 MB');
  });
});
