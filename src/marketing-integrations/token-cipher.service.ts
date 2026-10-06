import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

@Injectable()
export class TokenCipherService {
  constructor(private readonly config: ConfigService) {}

  private key() {
    const value =
      this.config.get<string>('MARKETING_TOKEN_ENCRYPTION_KEY') ?? '';
    const key = Buffer.from(
      value,
      /^[a-f0-9]{64}$/i.test(value) ? 'hex' : 'base64',
    );
    if (key.length !== 32)
      throw new ServiceUnavailableException(
        'A integração precisa ser configurada pela equipe técnica.',
      );
    return key;
  }

  encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key(), iv);
    const encrypted = Buffer.concat([
      cipher.update(value, 'utf8'),
      cipher.final(),
    ]);
    return [
      'v1',
      iv.toString('base64url'),
      cipher.getAuthTag().toString('base64url'),
      encrypted.toString('base64url'),
    ].join('.');
  }

  decrypt(value: string) {
    try {
      const [version, iv, tag, data] = value.split('.');
      if (version !== 'v1' || !iv || !tag || !data)
        throw new Error('Invalid ciphertext');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.key(),
        Buffer.from(iv, 'base64url'),
      );
      decipher.setAuthTag(Buffer.from(tag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(data, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível ler a autorização. Solicite a verificação da configuração técnica.',
      );
    }
  }
}
