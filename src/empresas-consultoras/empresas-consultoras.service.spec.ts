import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmpresasConsultorasService } from './empresas-consultoras.service';

describe('Gestão das empresas consultoras', () => {
  const admin = { sub: 'admin', email: 'admin@example.test', role: UserRole.ADMIN };
  function preparar() {
    const tx = {
      empresaConsultora: { findUnique: jest.fn().mockResolvedValue({ id: 'empresa-a', ativa: true }), update: jest.fn() },
      user: { findUnique: jest.fn().mockResolvedValue({ id: 'u', role: 'CONSULTORA', isActive: true, empresaConsultoraId: null }), update: jest.fn() },
      client: { findMany: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
      auditLog: { create: jest.fn().mockResolvedValue({}) },
    };
    const prisma = { ...tx, $transaction: jest.fn(async (fn: (value: typeof tx) => unknown) => fn(tx)) };
    return { tx, prisma, service: new EmpresasConsultorasService(prisma as unknown as PrismaService) };
  }
  it.each([UserRole.CONSULTORA, UserRole.COMERCIAL, UserRole.CLIENTE, UserRole.MARKETING])('bloqueia gestão pelo perfil %s', role => {
    const { service, prisma } = preparar();
    expect(() => service.vincularUsuario({ ...admin, role }, 'empresa-a', 'u', true)).toThrow(ForbiddenException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
  it('CONSULTORA combinada com ADMIN não ganha gestão', () => {
    const { service } = preparar();
    expect(() => service.listar({ ...admin, roles: ['ADMIN', 'CONSULTORA'] })).toThrow(ForbiddenException);
  });
  it('vincula a conta e audita sem transferir cadastros', async () => {
    const { service, tx } = preparar();
    await service.vincularUsuario(admin, 'empresa-a', 'u', true);
    expect(tx.user.update).toHaveBeenCalledWith(expect.objectContaining({ data: { empresaConsultoraId: 'empresa-a' } }));
    expect(tx.client.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ userId: admin.sub, targetType: 'User' }) }));
  });
  it.each([{ role: 'COMERCIAL', isActive: true }, { role: 'CONSULTORA', isActive: false }])('valida o perfil e atividade: %j', async usuario => {
    const { service, tx } = preparar();
    tx.user.findUnique.mockResolvedValue({ id: 'u', empresaConsultoraId: null, ...usuario });
    await expect(service.vincularUsuario(admin, 'empresa-a', 'u', true)).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.user.update).not.toHaveBeenCalled();
  });
  it('bloqueia novos vínculos em empresa inativa', async () => {
    const { service, tx } = preparar();
    tx.empresaConsultora.findUnique.mockResolvedValue({ id: 'empresa-a', ativa: false });
    await expect(service.vincularUsuario(admin, 'empresa-a', 'u', true)).rejects.toBeInstanceOf(BadRequestException);
  });
  it('a simulação não grava carteira ou auditoria', async () => {
    const { service, tx } = preparar();
    tx.client.findMany.mockResolvedValue([{ id: 'c', empresaConsultoraId: null, responsavelId: 'u', responsavel: { role: 'CONSULTORA', empresaConsultoraId: 'empresa-a' } }]);
    expect(await service.vincularCarteira(admin, 'empresa-a', { cadastroIds: ['c'] })).toEqual({ aplicado: false, quantidade: 1, cadastroIds: ['c'] });
    expect(tx.client.update).not.toHaveBeenCalled();
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });
  it('revalida toda a prévia antes de aplicar', async () => {
    const { service, tx } = preparar();
    tx.client.findMany.mockResolvedValue([
      { id: 'a', empresaConsultoraId: null, responsavel: { role: 'CONSULTORA', empresaConsultoraId: 'empresa-a' } },
      { id: 'b', empresaConsultoraId: null, responsavel: { role: 'CONSULTORA', empresaConsultoraId: 'empresa-b' } },
    ]);
    await expect(service.vincularCarteira(admin, 'empresa-a', { cadastroIds: ['a', 'b'], aplicar: true })).rejects.toBeInstanceOf(ConflictException);
    expect(tx.client.update).not.toHaveBeenCalled();
  });
  it('aplica cada vínculo preservando o responsável', async () => {
    const { service, tx } = preparar();
    tx.client.findMany.mockResolvedValue([{ id: 'c', empresaConsultoraId: null, responsavelId: 'u', responsavel: { role: 'CONSULTORA', empresaConsultoraId: 'empresa-a' } }]);
    await service.vincularCarteira(admin, 'empresa-a', { cadastroIds: ['c'], aplicar: true });
    expect(tx.client.update).toHaveBeenCalledWith({ where: { id: 'c' }, data: { empresaConsultoraId: 'empresa-a' } });
    expect(tx.auditLog.create).toHaveBeenCalledTimes(1);
  });
  it('transferência remove responsável incompatível e audita valores anteriores', async () => {
    const { service, tx } = preparar();
    tx.client.findUnique.mockResolvedValue({ id: 'c', empresaConsultoraId: 'empresa-b', responsavelId: 'u', responsavel: { empresaConsultoraId: 'empresa-b' } });
    expect(await service.transferirCadastro(admin, 'c', 'empresa-a')).toEqual({ id: 'c', empresaConsultoraId: 'empresa-a', responsavelId: null });
    expect(tx.auditLog.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ details: { empresaAnterior: 'empresa-b', empresaAtual: 'empresa-a', responsavelAnterior: 'u', responsavelAtual: null } }) }));
  });
});
