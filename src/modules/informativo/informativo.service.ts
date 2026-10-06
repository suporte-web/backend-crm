import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma, StatusInformativo } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CriarAssinanteDto } from './dto/criar-assinante.dto';
import { ListarAssinantesDto } from './dto/listar-assinantes.dto';

@Injectable()
export class InformativoService {
  private readonly logger = new Logger(InformativoService.name);

  constructor(private readonly prisma: PrismaService) {}

  async cadastrar(dto: CriarAssinanteDto) {
    const data = {
      nome: dto.nome,
      status: StatusInformativo.ATIVO,
      // Omitir um aceite não informado preserva o consentimento já registrado.
      ...(dto.aceitePrivacidade !== undefined
        ? { aceitePrivacidade: dto.aceitePrivacidade }
        : {}),
    };
    try {
      // Upsert pela chave única também impede duplicatas em envios simultâneos.
      await this.prisma.informativoAssinante.upsert({
        where: { email: dto.email },
        create: { ...data, email: dto.email, origem: 'SITE_PIZZATTOLOG' },
        update: data,
      });
      return {
        message:
          'Cadastro realizado com sucesso! Agora você receberá as novidades da Pizzattolog.',
      };
    } catch (error: unknown) {
      this.logger.error(
        'Falha ao cadastrar assinante do informativo.',
        error instanceof Error ? error.stack : undefined,
      );
      throw new ServiceUnavailableException(
        'Não foi possível concluir seu cadastro. Tente novamente em instantes.',
      );
    }
  }

  async listar(filtros: ListarAssinantesDto) {
    const where: Prisma.InformativoAssinanteWhereInput = {
      ...(filtros.status ? { status: filtros.status } : {}),
      ...(filtros.q
        ? {
            OR: [
              { nome: { contains: filtros.q, mode: 'insensitive' } },
              { email: { contains: filtros.q, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const [assinantes, total, ativos, descadastrados] =
      await this.prisma.$transaction([
        this.prisma.informativoAssinante.findMany({
          where,
          orderBy: { criadoEm: 'desc' },
        }),
        this.prisma.informativoAssinante.count(),
        this.prisma.informativoAssinante.count({
          where: { status: StatusInformativo.ATIVO },
        }),
        this.prisma.informativoAssinante.count({
          where: { status: StatusInformativo.DESCADASTRADO },
        }),
      ]);
    return { assinantes, totais: { total, ativos, descadastrados } };
  }
}
