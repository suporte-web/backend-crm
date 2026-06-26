import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
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
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MailService } from '../mail/mail.service';


@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly auditLogsService: AuditLogsService,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) { }

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
      throw new UnauthorizedException('Login Inválidos');
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
      throw new UnauthorizedException('Login Inválidos');
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

  private hashResetToken(token: string) {
    return createHash('sha256').update(token).digest('hex');
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const genericMessage =
      'Se este e-mail estiver cadastrado, enviaremos um link de recuperação.';

    const user = await this.usersService.findByEmail(dto.email);

    if (!user) {
      await this.auditLogsService.create({
        category: AuditLogCategory.AUTH,
        action: AuditLogAction.CUSTOM,
        level: AuditLogLevel.WARNING,
        message: `Solicitação de recuperação para e-mail inexistente: ${dto.email}.`,
        success: true,
        details: {
          email: dto.email,
        },
      });

      return {
        message: genericMessage,
      };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = this.hashResetToken(token);

    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:3000';
    const resetLink = `${frontendUrl}/reset-password?token=${token}`;

    try {
      await this.mailService.sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetLink,
      });
    } catch {
      return {
        message: genericMessage,
      };
    }

    await this.auditLogsService.create({
      category: AuditLogCategory.AUTH,
      action: AuditLogAction.CUSTOM,
      message: `Link de recuperação de senha gerado para ${user.email}.`,
      success: true,
      userId: user.id,
      targetType: 'User',
      targetId: user.id,
      details: {
        email: user.email,
        expiresAt,
      },
    });

    return {
      message: genericMessage,
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashResetToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!resetToken) {
      throw new BadRequestException('Link de recuperação inválido.');
    }

    if (resetToken.usedAt) {
      throw new BadRequestException('Este link de recuperação já foi utilizado.');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Este link de recuperação expirou.');
    }

    await this.usersService.setPasswordAfterReset(
      resetToken.userId,
      dto.newPassword,
    );

    await this.prisma.passwordResetToken.update({
      where: {
        id: resetToken.id,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await this.auditLogsService.create({
      category: AuditLogCategory.AUTH,
      action: AuditLogAction.CUSTOM,
      message: 'Senha redefinida por link de recuperação.',
      success: true,
      userId: resetToken.userId,
      targetType: 'User',
      targetId: resetToken.userId,
    });

    return {
      message: 'Senha redefinida com sucesso.',
    };
  }
}
