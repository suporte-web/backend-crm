import { Test, TestingModule } from '@nestjs/testing';

import { PrismaService } from '../../prisma/prisma.service';
import { SiteInstitucionalService } from './site-institucional.service';

describe('SiteInstitucionalService', () => {
  let service: SiteInstitucionalService;

  const prismaMock = {
    $transaction: jest.fn(),

    paginaSite: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SiteInstitucionalService,
        {
          provide: PrismaService,
          useValue: prismaMock,
        },
      ],
    }).compile();

    service = module.get<SiteInstitucionalService>(
      SiteInstitucionalService,
    );
  });

  describe('salvarRascunho', () => {
    it('deve salvar o conteúdo como rascunho sem alterar o conteúdo publicado', async () => {
      const conteudo = {
        banner: {
          titulo: 'Quem Somos',
          subtitulo: 'Conheça nossa história',
          imagemUrl: '',
        },

        historia: {
          titulo: 'Nossa História',
          texto: 'História da empresa',
          imagemUrl: '',
        },

        missao: {
          titulo: 'Missão',
          texto: 'Nossa missão',
        },

        visao: {
          titulo: 'Visão',
          texto: 'Nossa visão',
        },

        valores: [
          {
            titulo: 'Segurança',
            descricao: 'Segurança em primeiro lugar',
          },
        ],

        unidades: {
          titulo: 'Nossas Unidades',
          texto: 'Conheça nossas unidades',
        },
      };

      prismaMock.paginaSite.upsert.mockResolvedValue({
        id: 'pagina-1',
        nome: 'Quem Somos',
        slug: 'quem-somos',
        conteudoRascunho: conteudo,
        conteudoPublicado: null,
        publicado: false,
        temAlteracoesNaoPublicadas: true,
        publicadoEm: null,
      });

      const resultado = await service.salvarRascunho(
        'quem-somos',
        'Quem Somos',
        conteudo,
      );

      expect(prismaMock.paginaSite.upsert).toHaveBeenCalledWith({
        where: {
          slug: 'quem-somos',
        },

        create: {
          slug: 'quem-somos',
          nome: 'Quem Somos',
          conteudoRascunho: conteudo,
          publicado: false,
          temAlteracoesNaoPublicadas: true,
        },

        update: {
          nome: 'Quem Somos',
          conteudoRascunho: conteudo,
          temAlteracoesNaoPublicadas: true,
        },
      });

      expect(resultado.conteudoRascunho).toEqual(conteudo);

      expect(
        resultado.temAlteracoesNaoPublicadas,
      ).toBe(true);
    });
  });

  describe('sincronizarConteudoAtualDoSite', () => {
    it('deve gravar todas as paginas do site atual como rascunho e publicado', async () => {
      prismaMock.$transaction.mockImplementation(
        async (callbacks: Array<() => unknown>) =>
          Promise.all(callbacks),
      );

      prismaMock.paginaSite.upsert.mockImplementation(
        ({ create }) =>
          Promise.resolve({
            id: `pagina-${create.slug}`,
            createdAt: new Date('2026-09-16T12:00:00.000Z'),
            updatedAt: new Date('2026-09-16T12:00:00.000Z'),
            ...create,
          }),
      );

      const resultado =
        await service.sincronizarConteudoAtualDoSite();

      expect(resultado.length).toBeGreaterThanOrEqual(15);

      expect(prismaMock.paginaSite.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            slug: 'home',
          },
          create: expect.objectContaining({
            slug: 'home',
            publicado: true,
            temAlteracoesNaoPublicadas: false,
            conteudoRascunho: expect.objectContaining({
              hero: expect.objectContaining({
                titulo: 'A trilha de Sucesso da Pizzattolog',
              }),
            }),
            conteudoPublicado: expect.objectContaining({
              hero: expect.objectContaining({
                titulo: 'A trilha de Sucesso da Pizzattolog',
              }),
            }),
            publicadoEm: expect.any(Date),
          }),
          update: expect.objectContaining({
            publicado: true,
            temAlteracoesNaoPublicadas: false,
            conteudoRascunho: expect.objectContaining({
              hero: expect.objectContaining({
                titulo: 'A trilha de Sucesso da Pizzattolog',
              }),
            }),
            conteudoPublicado: expect.objectContaining({
              hero: expect.objectContaining({
                titulo: 'A trilha de Sucesso da Pizzattolog',
              }),
            }),
            publicadoEm: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('publicar', () => {
    it('deve copiar o rascunho para o conteúdo publicado', async () => {
      const conteudoRascunho = {
        banner: {
          titulo: 'Quem Somos',
          subtitulo: 'Conheça nossa nova história',
          imagemUrl: '',
        },

        historia: {
          titulo: 'Nossa História',
          texto: 'Nova história da empresa',
          imagemUrl: '',
        },

        missao: {
          titulo: 'Missão',
          texto: 'Nova missão',
        },

        visao: {
          titulo: 'Visão',
          texto: 'Nova visão',
        },

        valores: [
          {
            titulo: 'Segurança',
            descricao: 'Segurança em primeiro lugar',
          },
        ],

        unidades: {
          titulo: 'Nossas Unidades',
          texto: 'Conheça nossas unidades',
        },
      };

      prismaMock.paginaSite.findUnique.mockResolvedValue({
        id: 'pagina-1',
        nome: 'Quem Somos',
        slug: 'quem-somos',

        conteudoRascunho,

        conteudoPublicado: {
          missao: {
            titulo: 'Missão',
            texto: 'Missão antiga',
          },
        },

        publicado: true,
        temAlteracoesNaoPublicadas: true,
        publicadoEm: new Date(
          '2026-09-10T12:00:00.000Z',
        ),
      });

      prismaMock.paginaSite.update.mockResolvedValue({
        id: 'pagina-1',
        nome: 'Quem Somos',
        slug: 'quem-somos',

        conteudoRascunho,
        conteudoPublicado: conteudoRascunho,

        publicado: true,
        temAlteracoesNaoPublicadas: false,
        publicadoEm: new Date(),
      });

      const resultado = await service.publicar(
        'quem-somos',
      );

      expect(
        prismaMock.paginaSite.findUnique,
      ).toHaveBeenCalledWith({
        where: {
          slug: 'quem-somos',
        },
      });

      expect(
        prismaMock.paginaSite.update,
      ).toHaveBeenCalledWith({
        where: {
          slug: 'quem-somos',
        },

        data: {
          conteudoPublicado: conteudoRascunho,
          publicado: true,
          temAlteracoesNaoPublicadas: false,
          publicadoEm: expect.any(Date),
        },
      });

      expect(resultado.publicado).toBe(true);

      expect(
        resultado.temAlteracoesNaoPublicadas,
      ).toBe(false);

      expect(
        resultado.conteudoPublicado,
      ).toEqual(conteudoRascunho);
    });
    describe('buscarPagina', () => {
  it('deve buscar uma página pelo slug', async () => {
    const pagina = {
      id: 'pagina-1',
      nome: 'Quem Somos',
      slug: 'quem-somos',
      conteudoRascunho: {
        banner: {
          titulo: 'Quem Somos',
        },
      },
      conteudoPublicado: null,
      publicado: false,
      temAlteracoesNaoPublicadas: true,
      publicadoEm: null,
    };

    prismaMock.paginaSite.findUnique.mockResolvedValue(pagina);

    const resultado = await service.buscarPagina('quem-somos');

    expect(prismaMock.paginaSite.findUnique).toHaveBeenCalledWith({
      where: {
        slug: 'quem-somos',
      },
    });

    expect(resultado).toEqual(pagina);
  });
});
  });
  
});
