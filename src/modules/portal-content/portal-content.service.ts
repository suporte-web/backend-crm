import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePortalContentDto } from './dto/create-portal-content.dto';
import { UpdatePortalContentDto } from './dto/update-portal-content.dto';

@Injectable()
export class PortalContentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(authorId: string, dto: CreatePortalContentDto) {
    return this.prisma.portalContent.create({
      data: {
        title: dto.title,
        summary: dto.summary,
        body: dto.body,
        type: dto.type,
        coverImageUrl: dto.coverImageUrl,
        videoUrl: dto.videoUrl,
        isPublished: dto.isPublished ?? false,
        publishedAt: dto.isPublished ? new Date() : null,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async findAll(includeDrafts = false) {
    return this.prisma.portalContent.findMany({
      where: includeDrafts ? undefined : { isPublished: true },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async findPublished() {
    return this.findAll(false);
  }

  async findOne(id: string) {
    const content = await this.prisma.portalContent.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!content) {
      throw new NotFoundException('Portal content not found');
    }

    return content;
  }

  async update(id: string, dto: UpdatePortalContentDto) {
    await this.findOne(id);

    const shouldPublish =
      dto.isPublished === true
        ? new Date()
        : dto.isPublished === false
          ? null
          : undefined;

    return this.prisma.portalContent.update({
      where: { id },
      data: {
        title: dto.title,
        summary: dto.summary,
        body: dto.body,
        type: dto.type,
        coverImageUrl: dto.coverImageUrl,
        videoUrl: dto.videoUrl,
        isPublished: dto.isPublished,
        publishedAt: shouldPublish,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.portalContent.delete({
      where: { id },
    });

    return { message: 'Portal content deleted successfully' };
  }
}
