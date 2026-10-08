import { ConflictException, ForbiddenException } from '@nestjs/common';
import { StatusVisita } from '@prisma/client';
import { hasAnyRole } from '../../common/user-roles';
export type UsuarioVisita = { sub: string; role: string; roles?: string[] };
export const perfisGestaoVisitas = ['ADMIN', 'GESTAO', 'LIDER_ATENDIMENTO'];
export const gestorVisitas = (u: UsuarioVisita) =>
  hasAnyRole(u, perfisGestaoVisitas);
export function exigirGestor(u: UsuarioVisita) {
  if (!gestorVisitas(u))
    throw new ForbiddenException('Ação restrita à liderança/gestão.');
}
export function exigirPerfil(u: UsuarioVisita) {
  if (!gestorVisitas(u) && !hasAnyRole(u, ['ATENDIMENTO']))
    throw new ForbiddenException('Acesso restrito à equipe de atendimento.');
}
export function exigirAcesso(u: UsuarioVisita, responsavelId: string) {
  exigirPerfil(u);
  if (!gestorVisitas(u) && responsavelId !== u.sub)
    throw new ForbiddenException('Visita não atribuída a você.');
}
export function exigirEtapa(status: StatusVisita, permitidos: StatusVisita[]) {
  if (!permitidos.includes(status))
    throw new ConflictException(
      'Esta ação não está disponível na etapa atual. Atualize a visita.',
    );
}
