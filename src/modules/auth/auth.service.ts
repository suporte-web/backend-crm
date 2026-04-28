import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { AuditLogAction, AuditLogCategory, AuditLogLevel, UserRole } from '@prisma/client';
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
    } = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    await this.auditLogsService.create({
      category: AuditLogCategory.AUTH,
      action: AuditLogAction.LOGIN,
      message: `Login realizado por ${user.email}.`,
      userId: user.id,
      targetType: 'User',
      targetId: user.id,
    });

    return {
      access_token: await this.jwtService.signAsync(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientProfile: user.clientProfile ?? null,
      },
    };
  }

  async me(userId: string) {
    return this.usersService.findOne(userId);
  }
}

