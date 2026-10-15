import { BadRequestException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import {
  capturarProspeccao,
  dadosProspeccao,
  filtroProspeccao,
} from './prospeccao';
import { Test } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';

describe('Origem da prospecção', () => {
  it('usa ID autenticado e nome do servidor com perfis múltiplos', async () => {
    const findUnique = jest.fn().mockResolvedValue({ name: 'Carla' });
    const module = await Test.createTestingModule({
      providers: [
        { provide: PrismaService, useValue: { user: { findUnique } } },
      ],
    }).compile();
    expect(
      await capturarProspeccao(module.get(PrismaService), {
        sub: 'u1',
        email: 'carla@crm.test',
        role: UserRole.COMERCIAL,
        roles: [UserRole.COMERCIAL, UserRole.CONSULTORA],
      }),
    ).toEqual({ prospectedById: 'u1', prospectedByName: 'Carla' });
    expect(findUnique).toHaveBeenCalledWith({
      where: { id: 'u1' },
      select: { name: true },
    });
  });
  it('não atribui prospecção da consultora aos demais perfis', () => {
    expect(
      dadosProspeccao({
        sub: 'u1',
        role: UserRole.COMERCIAL,
        name: 'Comercial',
      }),
    ).toEqual({});
  });
  it.each([
    { criadoDe: '2026-02-30' },
    { criadoAte: 'inválido' },
    { criadoDe: '2026-10-15', criadoAte: '2026-10-14' },
  ])('rejeita período inválido %j', (filters) => {
    expect(() => filtroProspeccao(filters)).toThrow(BadRequestException);
  });
});
