import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import {
  AuditLogAction,
  AuditLogCategory,
  AuditLogLevel,
  UserRole,
} from '@prisma/client';
import { AuditLogsService } from '../audit-logs/audit-logs.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditLogsService: AuditLogsService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      await this.auditLogsService.create({
        category: AuditLogCategory.AUTH,
        action: AuditLogAction.LOGIN_FAILED,
        level: AuditLogLevel.WARNING,
        message: `Tentativa de login para e-mail inexistente: ${dto.email}.`,
        success: false,
        details: {
          email: dto.email,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      await this.auditLogsService.create({
        category: AuditLogCategory.AUTH,
        action: AuditLogAction.LOGIN_FAILED,
        level: AuditLogLevel.WARNING,
        message: `Tentativa de login com senha invalida para ${user.email}.`,
        success: false,
        userId: user.id,
        details: {
          email: user.email,
        },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: {
      sub: string;
      email: string;
      role: UserRole;
      mustChangePassword: boolean;
    } = {
      sub: user.id,
      email: user.email,
      role: user.role,
      mustChangePassword: user.mustChangePassword,
    };

    const [accessToken, screenPermissions] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.usersService.findRoleScreenPermissions(user.role),
    ]);

    await this.auditLogsService.create({
      category: AuditLogCategory.AUTH,
      action: AuditLogAction.LOGIN,
      message: `Login realizado por ${user.email}.`,
      userId: user.id,
      targetType: 'User',
      targetId: user.id,
    });

    return {
      access_token: accessToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
        clientProfile: user.clientProfile ?? null,
        screenPermissions,
      },
    };
  }

  async me(userId: string) {
    return this.usersService.findOne(userId);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.usersService.changePassword(
      userId,
      dto.currentPassword,
      dto.newPassword,
    );

    return {
      message: 'Senha atualizada com sucesso.',
      user,
    };
  }
}
