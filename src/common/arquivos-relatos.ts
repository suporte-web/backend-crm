import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function validarArquivoRelato(arquivo: Express.Multer.File) {
  const buffer = arquivo.buffer;
  const extensao =
    arquivo.mimetype === 'application/pdf' &&
    buffer.subarray(0, 5).toString() === '%PDF-'
      ? 'pdf'
      : arquivo.mimetype === 'image/png' &&
          buffer
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        ? 'png'
        : arquivo.mimetype === 'image/jpeg' &&
            buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          ? 'jpg'
          : null;
  if (!extensao || !arquivo.size || arquivo.size > 10 * 1024 * 1024)
    throw new BadRequestException(
      'Envie anexos PDF, JPG ou PNG de até 10 MB cada.',
    );
  return extensao;
}
export async function guardarArquivoRelato(
  diretorio: string,
  arquivo: Express.Multer.File,
  comentario?: string,
) {
  const extensao = validarArquivoRelato(arquivo);
  const id = randomUUID();
  const nome =
    arquivo.originalname
      .split(/[\\/]/)
      .pop()
      ?.replace(/[\u0000-\u001f]/g, '')
      .slice(0, 150) || `anexo.${extensao}`;
  const metadados = {
    id,
    nome,
    arquivo: `${id}.${extensao}`,
    tipo: arquivo.mimetype,
    tamanho: arquivo.size,
    comentario: comentario?.trim() || null,
  };
  await mkdir(diretorio, { recursive: true });
  await writeFile(join(diretorio, metadados.arquivo), arquivo.buffer, {
    flag: 'wx',
  });
  return metadados;
}
export async function lerArquivoRelato(diretorio: string, arquivo: string) {
  if (!/^[a-f0-9-]{36}\.(pdf|png|jpg)$/.test(arquivo))
    throw new NotFoundException('Anexo não encontrado.');
  return readFile(join(diretorio, arquivo)).catch(() => {
    throw new NotFoundException('Anexo não encontrado.');
  });
}
