import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { Prisma } from '@prisma/client';

import { PrismaService } from '../../prisma/prisma.service';
import { siteCurrentPages } from './site-current-content';

@Injectable()
export class SiteInstitucionalService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async salvarRascunho(
    slug: string,
    nome: string,
    conteudo: Prisma.InputJsonValue,
  ) {
    return this.prisma.paginaSite.upsert({
      where: {
        slug,
      },

      create: {
        slug,
        nome,
        conteudoRascunho: conteudo,
        publicado: false,
        temAlteracoesNaoPublicadas: true,
      },

      update: {
        nome,
        conteudoRascunho: conteudo,
        temAlteracoesNaoPublicadas: true,
      },
    });
  }

  async sincronizarConteudoAtualDoSite() {
    const publicadoEm = new Date();

    return this.prisma.$transaction(
      siteCurrentPages.map((pagina) =>
        this.prisma.paginaSite.upsert({
          where: {
            slug: pagina.slug,
          },

          create: {
            slug: pagina.slug,
            nome: pagina.nome,
            conteudoRascunho:
              pagina.conteudo as Prisma.InputJsonValue,
            conteudoPublicado:
              pagina.conteudo as Prisma.InputJsonValue,
            publicado: true,
            temAlteracoesNaoPublicadas: false,
            publicadoEm,
          },

          update: {
            nome: pagina.nome,
            conteudoRascunho:
              pagina.conteudo as Prisma.InputJsonValue,
            conteudoPublicado:
              pagina.conteudo as Prisma.InputJsonValue,
            publicado: true,
            temAlteracoesNaoPublicadas: false,
            publicadoEm,
          },
        }),
      ),
    );
  }

  async publicar(slug: string) {
    const pagina =
      await this.prisma.paginaSite.findUnique({
        where: {
          slug,
        },
      });

    if (!pagina) {
      throw new NotFoundException(
        'Página do site não encontrada.',
      );
    }

    if (pagina.conteudoRascunho === null) {
      throw new BadRequestException(
        'Não existe rascunho para publicar.',
      );
    }

    const conteudoRascunho =
      pagina.conteudoRascunho as Prisma.InputJsonValue;

    return this.prisma.paginaSite.update({
      where: {
        slug,
      },

      data: {
        conteudoPublicado: conteudoRascunho,
        publicado: true,
        temAlteracoesNaoPublicadas: false,
        publicadoEm: new Date(),
      },
    });
  }

  async buscarPagina(slug: string) {
    const pagina =
      await this.prisma.paginaSite.findUnique({
        where: {
          slug,
        },
      });

    if (!pagina) {
      throw new NotFoundException(
        'Página do site não encontrada.',
      );
    }

    return pagina;
  }

  async buscarPaginaPublicada(slug: string) {
    const pagina =
      await this.prisma.paginaSite.findUnique({
        where: {
          slug,
        },
      });

    if (
      !pagina ||
      !pagina.publicado ||
      pagina.conteudoPublicado === null
    ) {
      throw new NotFoundException(
        'Página publicada não encontrada.',
      );
    }

    return {
      nome: pagina.nome,
      slug: pagina.slug,
      conteudo: pagina.conteudoPublicado,
      publicadoEm: pagina.publicadoEm,
    };
  }
}
