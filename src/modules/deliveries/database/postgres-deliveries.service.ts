import {
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class PostgresDeliveriesService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    // A conexao usa apenas variaveis de ambiente, sem credenciais fixas.
    this.pool = new Pool({
      host: this.getRequiredConfig('DB_HOST'),
      port: Number(this.getRequiredConfig('DB_PORT')),
      database: this.getRequiredConfig('DB_NAME'),
      user: this.getRequiredConfig('DB_USER'),
      password: this.getRequiredConfig('DB_PASSWORD'),
    });
  }

  private getRequiredConfig(key: string) {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new InternalServerErrorException(
        `Variavel de ambiente obrigatoria nao configurada: ${key}`,
      );
    }

    return value;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: Array<string> = [],
  ) {
    try {
      const result = await this.pool.query<T>(text, values);
      return result.rows;
    } catch {
      throw new InternalServerErrorException(
        'Nao foi possivel consultar o banco de entregas.',
      );
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
