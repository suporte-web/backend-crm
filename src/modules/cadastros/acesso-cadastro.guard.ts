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
import type { AuthUser } from '../auth/types/auth-user.type';

@Injectable()
export class AcessoCadastroGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<{
      user: AuthUser;
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
    await validarAutoriaCadastro(this.prisma, req.user, cadastro);
    if (req.params.opportunityId) {
      const oportunidade = await this.prisma.opportunity.findUnique({
        where: { id: req.params.opportunityId },
      });
      if (!oportunidade || oportunidade.clientId !== id)
        throw new NotFoundException(
          'Oportunidade não encontrada neste cadastro.',
        );
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
