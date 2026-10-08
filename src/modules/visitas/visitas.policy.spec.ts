import { ForbiddenException, ConflictException } from '@nestjs/common';
import { exigirAcesso, exigirGestor, exigirEtapa } from './visitas.policy';

describe('Regras de Gestão de Visitas', () => {
  const atendente = { sub: 'ana', role: 'ATENDIMENTO' };
  it('restringe atendente à sua visita', () => {
    expect(() => exigirAcesso(atendente, 'ana')).not.toThrow();
    expect(() => exigirAcesso(atendente, 'outro')).toThrow(ForbiddenException);
  });
  it('recusa perfis externos mesmo quando atribuídos', () => {
    expect(() => exigirAcesso({ sub: 'ana', role: 'CLIENTE' }, 'ana')).toThrow(
      ForbiddenException,
    );
  });
  it('usa todos os perfis e permite liderança validar', () => {
    expect(() =>
      exigirGestor({
        sub: 'ana',
        role: 'COMERCIAL',
        roles: ['COMERCIAL', 'GESTAO'],
      }),
    ).not.toThrow();
    expect(() =>
      exigirGestor({ sub: 'ana', role: 'LIDER_ATENDIMENTO' }),
    ).not.toThrow();
    expect(() => exigirGestor(atendente)).toThrow(ForbiddenException);
  });
  it('bloqueia pular validação e reabrir visitas concluídas', () => {
    expect(() => exigirEtapa('AGENDADA', ['POS_VISITA'])).toThrow(
      ConflictException,
    );
    expect(() =>
      exigirEtapa('CONCLUIDA', ['AGENDADA', 'REAGENDAMENTO']),
    ).toThrow(ConflictException);
    expect(() =>
      exigirEtapa('AGUARDANDO_VALIDACAO', ['AGUARDANDO_VALIDACAO']),
    ).not.toThrow();
  });
});
