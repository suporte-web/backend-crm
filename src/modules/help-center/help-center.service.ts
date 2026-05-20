import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateHelpArticleDto } from './dto/create-help-article.dto';
import { UpdateHelpArticleDto } from './dto/update-help-article.dto';

const FALLBACK_ANSWER =
  'Nao encontrei essa informacao na Central de Ajuda. Por favor, entre em contato com o suporte.';

type HelpArticleSearchItem = {
  id: string;
  title: string;
  questions: string[];
  answer: string;
  category: string;
  tags: string[];
};

@Injectable()
export class HelpCenterService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateHelpArticleDto, userId: string) {
    const data = this.normalizeCreatePayload(dto);

    return this.prisma.helpCenterArticle.create({
      data: {
        ...data,
        active: dto.active ?? true,
        createdById: userId,
        updatedById: userId,
      },
      include: this.includeUsers(),
    });
  }

  async findAll() {
    return this.prisma.helpCenterArticle.findMany({
      include: this.includeUsers(),
      orderBy: [{ active: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  async findOne(id: string) {
    const article = await this.prisma.helpCenterArticle.findUnique({
      where: { id },
      include: this.includeUsers(),
    });

    if (!article) {
      throw new NotFoundException(
        'Conteudo da Central de Ajuda nao encontrado.',
      );
    }

    return article;
  }

  async update(id: string, dto: UpdateHelpArticleDto, userId: string) {
    await this.findOne(id);

    return this.prisma.helpCenterArticle.update({
      where: { id },
      data: {
        ...this.normalizeUpdatePayload(dto),
        updatedById: userId,
      },
      include: this.includeUsers(),
    });
  }

  async updateStatus(id: string, active: boolean, userId: string) {
    await this.findOne(id);

    return this.prisma.helpCenterArticle.update({
      where: { id },
      data: {
        active,
        updatedById: userId,
      },
      include: this.includeUsers(),
    });
  }

  async answerChat(message: string) {
    const normalizedMessage = message.trim();

    if (!normalizedMessage) {
      throw new BadRequestException('Mensagem obrigatoria.');
    }

    if (normalizedMessage.length > 1000) {
      throw new BadRequestException(
        'Mensagem deve ter no maximo 1000 caracteres.',
      );
    }

    const articles = await this.prisma.helpCenterArticle.findMany({
      where: { active: true },
      select: {
        id: true,
        title: true,
        questions: true,
        answer: true,
        category: true,
        tags: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
    const match = this.findBestArticle(normalizedMessage, articles);

    if (!match) {
      return {
        answer: FALLBACK_ANSWER,
        matched: false,
      };
    }

    return {
      answer: match.answer,
      matched: true,
      article: {
        id: match.id,
        title: match.title,
        category: match.category,
      },
    };
  }

  private normalizeCreatePayload(dto: CreateHelpArticleDto) {
    const data = this.normalizePayload(dto);

    if (!data.title) throw new BadRequestException('Titulo obrigatorio.');
    if (!data.answer) throw new BadRequestException('Resposta obrigatoria.');
    if (!data.category) throw new BadRequestException('Categoria obrigatoria.');
    if (!data.questions?.length) {
      throw new BadRequestException('Informe ao menos uma pergunta.');
    }
    if (!data.tags?.length) {
      throw new BadRequestException('Informe ao menos uma tag.');
    }

    return {
      title: data.title,
      questions: data.questions,
      answer: data.answer,
      category: data.category,
      tags: data.tags,
      active: data.active,
    };
  }

  private normalizeUpdatePayload(dto: UpdateHelpArticleDto) {
    const data = this.normalizePayload(dto);

    if (dto.title !== undefined && !data.title) {
      throw new BadRequestException('Titulo obrigatorio.');
    }
    if (dto.answer !== undefined && !data.answer) {
      throw new BadRequestException('Resposta obrigatoria.');
    }
    if (dto.category !== undefined && !data.category) {
      throw new BadRequestException('Categoria obrigatoria.');
    }
    if (dto.questions !== undefined && !data.questions?.length) {
      throw new BadRequestException('Informe ao menos uma pergunta.');
    }
    if (dto.tags !== undefined && !data.tags?.length) {
      throw new BadRequestException('Informe ao menos uma tag.');
    }

    return data;
  }

  private normalizePayload(dto: CreateHelpArticleDto | UpdateHelpArticleDto) {
    const title = dto.title?.trim();
    const answer = dto.answer?.trim();
    const category = dto.category?.trim();
    const questions = dto.questions
      ?.map((question) => question.trim())
      .filter(Boolean);
    const tags = dto.tags?.map((tag) => tag.trim()).filter(Boolean);

    return {
      title,
      answer,
      category,
      questions,
      tags,
      active: dto.active,
    };
  }

  private findBestArticle(
    message: string,
    articles: HelpArticleSearchItem[],
  ): HelpArticleSearchItem | null {
    const query = this.normalizeText(message);
    const tokens = this.tokenize(query);
    let best: { article: HelpArticleSearchItem; score: number } | null = null;

    for (const article of articles) {
      const searchable = this.normalizeText(
        [
          article.title,
          article.category,
          article.answer,
          ...article.questions,
          ...article.tags,
        ].join(' '),
      );
      const questionText = this.normalizeText(article.questions.join(' '));
      const tagText = this.normalizeText(article.tags.join(' '));
      let score = 0;

      if (questionText.includes(query)) score += 12;
      if (searchable.includes(query)) score += 8;

      for (const token of tokens) {
        if (questionText.includes(token)) score += 4;
        if (tagText.includes(token)) score += 3;
        if (searchable.includes(token)) score += 1;
      }

      if (score > 0 && (!best || score > best.score)) {
        best = { article, score };
      }
    }

    return best?.article ?? null;
  }

  private tokenize(value: string) {
    return value
      .split(/\s+/)
      .map((token) => token.trim())
      .filter((token) => token.length >= 3);
  }

  private normalizeText(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private includeUsers() {
    return {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
      updatedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      },
    };
  }
}
