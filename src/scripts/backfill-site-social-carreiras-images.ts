import { NestFactory } from '@nestjs/core';

import { Prisma } from '@prisma/client';

import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

type JsonRecord = Record<string, unknown>;

const imageBackfill: Record<string, JsonRecord> = {
  social: {
    hero: {
      imagemUrl: '/images/programas/logo Entre Rotas.png',
    },
  },
  carreiras: {
    hero: {
      imagemUrl: '/images/carreira/carreiras-banner.png',
    },
    programas: [
      {
        imagem: '/images/carreira/rotadeoportunidade.png',
      },
      {
        imagem: '/images/carreira/cafecomrh.png',
      },
      {
        imagem: '/images/carreira/rotadosaber.png',
      },
    ],
  },
};

function isRecord(
  value: unknown,
): value is JsonRecord {
  return Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value);
}

function mergeMissing(
  current: unknown,
  fallback: unknown,
): unknown {
  if (Array.isArray(fallback)) {
    const currentItems =
      Array.isArray(current)
        ? current
        : [];

    return fallback.map((item, index) =>
      mergeMissing(
        currentItems[index],
        item,
      ),
    );
  }

  if (isRecord(fallback)) {
    const merged: JsonRecord =
      isRecord(current)
        ? { ...current }
        : {};

    Object.entries(fallback).forEach(([
      key,
      value,
    ]) => {
      merged[key] =
        mergeMissing(
          merged[key],
          value,
        );
    });

    return merged;
  }

  if (
    current === undefined ||
    current === null ||
    current === ''
  ) {
    return fallback;
  }

  return current;
}

async function main() {
  const app =
    await NestFactory.createApplicationContext(
      AppModule,
      {
        logger: ['error', 'warn', 'log'],
      },
    );

  try {
    const prisma =
      app.get(PrismaService);

    let updatedPages = 0;

    for (const [slug, fallback] of Object.entries(imageBackfill)) {
      const pagina =
        await prisma.paginaSite.findUnique({
          where: {
            slug,
          },
        });

      if (!pagina) {
        continue;
      }

      const data: Prisma.PaginaSiteUpdateInput = {
        conteudoRascunho:
          mergeMissing(
            pagina.conteudoRascunho,
            fallback,
          ) as Prisma.InputJsonValue,
      };

      if (pagina.conteudoPublicado !== null) {
        data.conteudoPublicado =
          mergeMissing(
            pagina.conteudoPublicado,
            fallback,
          ) as Prisma.InputJsonValue;
      }

      await prisma.paginaSite.update({
        where: {
          slug,
        },
        data,
      });

      updatedPages += 1;
    }

    console.log(
      `Backfill de imagens aplicado em ${updatedPages} paginas.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(
    'Erro ao aplicar backfill de imagens em Social e Carreiras.',
    error,
  );

  process.exitCode = 1;
});
