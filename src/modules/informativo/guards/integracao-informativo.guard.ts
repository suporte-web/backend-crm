import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';

@Injectable()
export class IntegracaoInformativoGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const expected = this.config.get<string>('SITE_LEAD_INTEGRATION_TOKEN');
    const token = context.switchToHttp().getRequest<Request>().headers[
      'x-integration-token'
    ];
    if (!expected || typeof token !== 'string') {
      throw new ForbiddenException('Integração não autorizada.');
    }
    const receivedBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expected);
    if (
      receivedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(receivedBuffer, expectedBuffer)
    ) {
      throw new ForbiddenException('Integração não autorizada.');
    }
    return true;
  }
}
