import { getUserRoles } from '../../common/user-roles';
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
@Injectable()
export class UsuarioSacGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context
      .switchToHttp()
      .getRequest<{ user: { sub: string; role: string; roles?: string[] } }>();
    const usuario = await this.prisma.user.findUnique({
      where: { id: req.user.sub },
      select: { role: true, roles: true, isActive: true },
    });
    if (!usuario?.isActive)
      throw new ForbiddenException('Usuário inativo ou não encontrado.');
    req.user.role = usuario.role;
    req.user.roles = getUserRoles(usuario);
    return true;
  }
}
