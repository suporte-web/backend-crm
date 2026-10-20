import { Expose, Transform } from 'class-transformer';

/** Converte entradas anteriores para o nome em português sem alterar os dados. */
export function CampoCompativel(
  nomeAtual: string,
  nomeAnterior: string,
  numerico = false,
): PropertyDecorator {
  return (alvo, propriedade) => {
    Expose({ name: nomeAnterior })(alvo, propriedade);
    Transform(({ obj }: { obj: Record<string, unknown> }) => {
      const valor = Object.prototype.hasOwnProperty.call(obj, nomeAtual)
        ? obj[nomeAtual]
        : obj[nomeAnterior];
      return numerico && valor !== null && valor !== undefined
        ? Number(valor)
        : valor;
    })(alvo, propriedade);
  };
}
