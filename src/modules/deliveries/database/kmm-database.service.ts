import {
  Injectable,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

type QueryValue = string | number | null;

@Injectable()
export class KmmDatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(private readonly configService: ConfigService) {
    // Conexao com o banco KMM usando apenas variaveis de ambiente.
    this.pool = new Pool({
      host: this.getRequiredConfig('KMM_DB_HOST'),
      port: Number(this.getRequiredConfig('KMM_DB_PORT')),
      database: this.getRequiredConfig('KMM_DB_NAME'),
      user: this.getRequiredConfig('KMM_DB_USER'),
      password: this.getRequiredConfig('KMM_DB_PASSWORD'),
    });
  }

  private getRequiredConfig(key: string): string {
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
    values: QueryValue[] = [],
  ): Promise<T[]> {
    try {
      const result = await this.pool.query<T>(text, values);

      return result.rows;
    } catch (error) {
      console.error('Erro ao consultar banco KMM:', error);

      throw new InternalServerErrorException(
        'Nao foi possivel consultar o banco KMM.',
      );
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
