import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { randomUUID } from 'crypto';

import {
  access,
  mkdir,
  writeFile,
} from 'fs/promises';

import {
  basename,
  join,
  resolve,
  sep,
} from 'path';

export type SiteUploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

@Injectable()
export class SiteAssetsService {
  private readonly rootPath = resolve(
    process.env.SITE_UPLOAD_DIR ??
      join(process.cwd(), 'storage', 'site'),
  );

  async salvarImagem(
    slug: string,
    file?: SiteUploadFile,
  ) {
    if (!file) {
      throw new BadRequestException(
        'Selecione uma imagem para enviar.',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException(
        'A imagem deve ter no máximo 5 MB.',
      );
    }

    const extension =
      EXTENSION_BY_MIME_TYPE[file.mimetype];

    if (!extension) {
      throw new BadRequestException(
        'Formato não permitido. Use JPG, PNG ou WEBP.',
      );
    }

    const safeSlug = this.normalizarSlug(slug);

    const directory = join(
      this.rootPath,
      safeSlug,
    );

    await mkdir(directory, {
      recursive: true,
    });

    const fileName =
      `${randomUUID()}${extension}`;

    const filePath = join(
      directory,
      fileName,
    );

    await writeFile(
      filePath,
      file.buffer,
    );

    return {
      fileName,

      path:
        `/api/public/site/assets/${safeSlug}/${fileName}`,

      mimeType: file.mimetype,

      size: file.size,
    };
  }

  async localizarImagem(
    slug: string,
    fileName: string,
  ) {
    const safeSlug =
      this.normalizarSlug(slug);

    if (basename(fileName) !== fileName) {
      throw new NotFoundException(
        'Imagem não encontrada.',
      );
    }

    const filePath = resolve(
      this.rootPath,
      safeSlug,
      fileName,
    );

    const rootPath = resolve(
      this.rootPath,
    );

    if (
      !filePath.startsWith(
        `${rootPath}${sep}`,
      )
    ) {
      throw new NotFoundException(
        'Imagem não encontrada.',
      );
    }

    try {
      await access(filePath);
    } catch {
      throw new NotFoundException(
        'Imagem não encontrada.',
      );
    }

    return filePath;
  }

  private normalizarSlug(
    slug: string,
  ) {
    const safeSlug = slug
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');

    if (!safeSlug) {
      throw new BadRequestException(
        'Página inválida.',
      );
    }

    return safeSlug;
  }
}