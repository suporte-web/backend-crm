import {
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  assertOpportunityAccess,
  assertOpportunityOwner,
  isConsultora,
} from './opportunity-access';
import { AuthUser } from '../modules/auth/types/auth-user.type';

@Injectable()
export class ConsultoraProposalUploadGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AuthUser; params: { id: string } }>();
    if (!isConsultora(request.user)) return true;
    await assertOpportunityAccess(this.prisma, request.user);
    const client = await this.prisma.client.findUnique({
      where: { id: request.params.id },
      select: { internalOwnerId: true },
    });
    if (!client) throw new NotFoundException('Cadastro não encontrado.');
    assertOpportunityOwner(request.user, client);
    return true;
  }
}
