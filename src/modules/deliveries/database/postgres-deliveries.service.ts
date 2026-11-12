import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, QueryResultRow } from 'pg';

@Injectable()
export class PostgresDeliveriesService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly logger = new Logger(PostgresDeliveriesService.name);

  constructor(private readonly configService: ConfigService) {
    // A conexao usa apenas variaveis de ambiente,
    // sem credenciais fixas no codigo.
    this.pool = new Pool({
      host: this.getRequiredConfig('DB_HOST'),
      port: Number(this.getRequiredConfig('DB_PORT')),
      database: this.getRequiredConfig('DB_NAME'),
      user: this.getRequiredConfig('DB_USER'),
      password: this.getRequiredConfig('DB_PASSWORD'),
    });
    // O pg ja descarta o cliente ocioso quebrado; o listener impede erro sem tratamento.
    this.pool.on('error', (error: Error) => {
      this.logger.error('Conexao ociosa com entregas/SSW encerrada.', error.stack);
    });
  }

  private getRequiredConfig(key: string): string {
    const value = this.configService.get<string>(key);

    if (!value) {
      throw new InternalServerErrorException(
        `Variavel de ambiente obrigatoria não configurada: ${key}`,
      );
    }

    return value;
  }

  async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    values: Array<string | number> = [],
  ): Promise<T[]> {
    try {
      const result = await this.pool.query<T>(text, values);

      return result.rows;
    } catch {
      throw new InternalServerErrorException(
        'Não foi possível consultar o banco de entregas.',
      );
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}