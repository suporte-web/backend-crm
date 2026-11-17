import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BiComercialService } from './bi-comercial.service';

describe('Escopo do BI Comercial', () => {
  const consultora = { sub: 'consultora-a', email: 'teste@example.test', role: UserRole.CONSULTORA };
  function preparar(permissoes: unknown[] = []) {
    const prisma = {
      roleScreenPermission: { findMany: jest.fn().mockResolvedValue(permissoes) },
      client: { findMany: jest.fn().mockResolvedValue([{ id: 'cadastro', responsavelId: consultora.sub, responsavel: { id: consultora.sub, name: 'Nome atual' }, leadCadastro: { id: 'lead', metadata: { responsible: 'Nome antigo', nextAction: 'Contato', segredo: 'não expor' } } }]) },
      opportunity: { findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: consultora.sub, name: 'Nome atual' }]) },
    };
    return { prisma, service: new BiComercialService(prisma as unknown as PrismaService) };
  }

  it('força o ID da consultora e não utiliza criador, prospectador ou nome como autorização', async () => {
    const { prisma, service } = preparar([{ role: 'CONSULTORA', screenKey: 'opportunities', isEnabled: true }]);
    const result = await service.consultar(consultora);
    expect(prisma.client.findMany.mock.calls[0][0].where).toEqual({ modalidadeCadastro: { in: ['CLIENTE', 'LEAD'] }, responsavelId: consultora.sub });
    expect(prisma.opportunity.findMany.mock.calls[0][0].where.client.responsavelId).toBe(consultora.sub);
    expect(prisma.user.findMany.mock.calls[0][0].where).toEqual({ id: consultora.sub, isActive: true });
    expect(result.cadastros[0].responsavel).toBe('Nome atual');
    expect(result.cadastros[0].leadCadastro?.metadata).toEqual({ nextAction: 'Contato', responsible: 'Nome atual' });
    expect(result.responsavelFixo).toBe(true);
  });

  it.each([{ responsavelId: 'outra-pessoa' }, { semResponsavel: 'true' as const }])('rejeita tentativa de contornar o escopo: %j', async filtros => {
    const { prisma, service } = preparar();
    await expect(service.consultar(consultora, filtros)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.client.findMany).not.toHaveBeenCalled();
  });

  it('perfil combinado com Consultora continua restrito ao próprio ID', async () => {
    const { prisma, service } = preparar();
    await service.consultar({ ...consultora, roles: [UserRole.ADMIN, UserRole.CONSULTORA] });
    expect(prisma.client.findMany.mock.calls[0][0].where.responsavelId).toBe(consultora.sub);
  });

  it('respeita bloqueio explícito do BI e o acesso às oportunidades', async () => {
    const { service, prisma } = preparar([{ role: 'CONSULTORA', screenKey: 'commercialBi', isEnabled: false }]);
    await expect(service.consultar(consultora)).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.client.findMany).not.toHaveBeenCalled();
    const liberado = preparar();
    expect((await liberado.service.consultar(consultora)).oportunidades).toBeNull();
    expect(liberado.prisma.opportunity.findMany).not.toHaveBeenCalled();
  });

  it('gestão pode filtrar usuário ou cadastros não vinculados', async () => {
    const { service, prisma } = preparar();
    const gestao = { ...consultora, role: UserRole.GESTAO };
    await service.consultar(gestao, { responsavelId: 'selecionado' });
    expect(prisma.client.findMany.mock.calls[0][0].where.responsavelId).toBe('selecionado');
    await service.consultar(gestao, { semResponsavel: 'true' });
    expect(prisma.client.findMany.mock.calls[1][0].where.responsavelId).toBeNull();
  });

  it('não libera outros perfis apenas por terem uma permissão gravada', async () => {
    const { service } = preparar([{ role: 'MARKETING', screenKey: 'commercialBi', isEnabled: true }]);
    await expect(service.consultar({ ...consultora, role: UserRole.MARKETING })).rejects.toBeInstanceOf(ForbiddenException);
  });
});
