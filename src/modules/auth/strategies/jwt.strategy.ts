import { UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../../users/users.service';
import { getUserRoles } from '../../../common/user-roles';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRole } from '../enums/user-role.enum';
import { AuthUser } from '../types/auth-user.type';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService, private readonly usersService: UsersService) {
    const secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      throw new Error('JWT_SECRET is not defined');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findOne(payload.sub);
    if (!user.isActive) throw new UnauthorizedException('Usuário inativo.');
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: getUserRoles(user),
    };
  }
}
