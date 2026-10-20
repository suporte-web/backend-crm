import { BadRequestException } from '@nestjs/common';

export function validarFotoCadastro(valor: string): string {
  if (!valor) return '';
  const partes =
    /^data:image\/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/]+={0,2})$/.exec(
      valor,
    );
  if (!partes)
    throw new BadRequestException('Envie uma imagem PNG, JPG, WebP ou GIF.');
  const arquivo = Buffer.from(partes[2], 'base64');
  if (arquivo.length > 1.5 * 1024 * 1024)
    throw new BadRequestException('A imagem precisa ter até 1,5 MB.');
  const formatoValido =
    (partes[1] === 'png' &&
      arquivo.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) ||
    (partes[1] === 'jpeg' &&
      arquivo.subarray(0, 3).equals(Buffer.from('ffd8ff', 'hex'))) ||
    (partes[1] === 'gif' &&
      ['GIF87a', 'GIF89a'].includes(arquivo.subarray(0, 6).toString())) ||
    (partes[1] === 'webp' &&
      arquivo.subarray(0, 4).toString() === 'RIFF' &&
      arquivo.subarray(8, 12).toString() === 'WEBP');
  if (!formatoValido)
    throw new BadRequestException(
      'O arquivo enviado não corresponde a uma imagem válida.',
    );
  return valor;
}
