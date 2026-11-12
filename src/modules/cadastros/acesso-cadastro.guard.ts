import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  validarAcessoCadastro,
  validarAutoriaCadastro,
} from '../../common/permissoes-cadastros';
import { hasAnyRole } from '../../common/user-roles';
import { cadastroMcg } from '../../common/acesso-consultora';
import type { AuthUser } from '../auth/types/auth-user.type';

@Injectable()
export class AcessoCadastroGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      user: AuthUser;
      method?: string;
      params: { id?: string; clientId?: string; opportunityId?: string };
    }>();
    const id = req.params.clientId || req.params.id;
    if (!id) return true;
    const cadastro = await this.prisma.client.findUnique({ where: { id } });
    if (!cadastro) throw new NotFoundException('Cadastro não encontrado.');
    await validarAcessoCadastro(
      this.prisma,
      req.user,
      cadastro.modalidadeCadastro,
    );
    await validarAutoriaCadastro(this.prisma, req.user, cadastro, req.method === 'GET');
    if (req.params.opportunityId) {
      const oportunidade = await this.prisma.opportunity.findUnique({
        where: { id: req.params.opportunityId },
      });
      if (!oportunidade || oportunidade.clientId !== id)
        throw new NotFoundException(
          'Oportunidade não encontrada neste cadastro.',
        );
      if (hasAnyRole(req.user, ['CONSULTORA'])) {
        const mcg = await this.prisma.client.findFirst({
          where: { id, ...cadastroMcg() },
          select: { id: true },
        });
        if (!mcg) throw new ForbiddenException('Você não tem permissão para alterar esta oportunidade.');
        const evento = await this.prisma.timelineEvent.findFirst({
          where: { clientId: id, type: 'OPPORTUNITY_CREATED', createdById: req.user.sub, metadata: { path: ['opportunityId'], equals: oportunidade.id } },
          select: { id: true },
        });
        if (!evento) throw new ForbiddenException('Você não tem permissão para alterar esta oportunidade.');
      }
      if (
        !hasAnyRole(req.user, ['ADMIN', 'GESTAO']) &&
        cadastro.internalOwnerId !== req.user.sub
      )
        throw new ForbiddenException(
          'Você não tem permissão para alterar esta oportunidade.',
        );
    }
    return true;
  }
}
