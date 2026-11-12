import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { AuditLogsService } from '../audit-logs/audit-logs.service';
import { PrismaService } from '../../prisma/prisma.service';
import { MailService } from '../mail/mail.service';

describe('AuthService', () => {
  let service: AuthService;
  const users = {
    findByEmail: jest.fn(),
    findUserScreenPermissions: jest.fn(),
  };
  const jwt = { signAsync: jest.fn() };
  const audit = { create: jest.fn() };

  beforeEach(async () => {
    jest.resetAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: users },
        { provide: JwtService, useValue: jwt },
        { provide: AuditLogsService, useValue: audit },
        { provide: PrismaService, useValue: {} },
        {
          provide: MailService,
          useValue: { sendPasswordResetEmail: jest.fn() },
        },
      ],
    }).compile();
    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('rejects and audits unknown credentials without issuing a token', async () => {
    users.findByEmail.mockResolvedValue(null);
    await expect(
      service.login({ email: 'missing@example.com', password: 'password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        success: false,
        details: { email: 'missing@example.com' },
      }),
    );
  });

  it('rejects an incorrect password without issuing a token', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      passwordHash: await bcrypt.hash('correct-password', 4),
    });
    await expect(
      service.login({ email: 'user@example.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'LOGIN_FAILED',
        success: false,
        userId: 'user-1',
      }),
    );
  });

  it('issues a token with authenticated roles and returns screen permissions', async () => {
    users.findByEmail.mockResolvedValue({
      id: 'user-1',
      name: 'Example',
      email: 'user@example.com',
      passwordHash: await bcrypt.hash('correct-password', 4),
      role: 'COMERCIAL',
      roles: ['COMERCIAL', 'GESTAO'],
      mustChangePassword: true,
      clientProfile: null,
    });
    users.findUserScreenPermissions.mockResolvedValue([
      { screenKey: 'clients', isEnabled: true },
    ]);
    jwt.signAsync.mockResolvedValue('signed-token');
    await expect(
      service.login({
        email: 'user@example.com',
        password: 'correct-password',
      }),
    ).resolves.toEqual({
      access_token: 'signed-token',
      user: {
        id: 'user-1',
        name: 'Example',
        email: 'user@example.com',
        role: 'COMERCIAL',
        roles: ['COMERCIAL', 'GESTAO'],
        mustChangePassword: true,
        clientProfile: null,
        screenPermissions: [{ screenKey: 'clients', isEnabled: true }],
      },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({
      sub: 'user-1',
      email: 'user@example.com',
      role: 'COMERCIAL',
      roles: ['COMERCIAL', 'GESTAO'],
      mustChangePassword: true,
    });
    expect(audit.create).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'LOGIN', userId: 'user-1' }),
    );
  });
});
