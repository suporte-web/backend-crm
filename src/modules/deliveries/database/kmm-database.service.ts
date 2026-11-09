import {
  Injectable,
  Logger,
  InternalServerErrorException,
  OnModuleDestroy,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool, type PoolClient, type QueryResultRow } from 'pg';

type QueryValue = string | number | null;

@Injectable()
export class KmmDatabaseService implements OnModuleDestroy {
  private readonly pool: Pool;
  private readonly logger = new Logger(KmmDatabaseService.name);

  constructor(private readonly configService: ConfigService) {
    // Conexao com o banco KMM usando apenas variaveis de ambiente.
    this.pool = new Pool({
      host: this.getRequiredConfig('KMM_DB_HOST'),
      port: Number(this.getRequiredConfig('KMM_DB_PORT')),
      database: this.getRequiredConfig('KMM_DB_NAME'),
      user: this.getRequiredConfig('KMM_DB_USER'),
      password: this.getRequiredConfig('KMM_DB_PASSWORD'),
    });
    // O pg ja descarta o cliente ocioso quebrado; o listener impede erro sem tratamento.
    this.pool.on('error', (error: Error) => {
      this.logger.error('Conexao ociosa com KMM encerrada.', error.stack);
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
    options?: { preferBitmapScan?: boolean },
  ): Promise<T[]> {
    let client: PoolClient | undefined;
    let discardConnection = false;
    const handleClientError = (error: Error) => {
      discardConnection = true;
      this.logger.error('Conexao com KMM interrompida durante a consulta.', error.stack);
    };
    try {
      if (!options?.preferBitmapScan) {
        const result = await this.pool.query<T>(text, values);
        return result.rows;
      }

      // A busca ampla de eventos por dia/placa se beneficia da leitura em blocos.
      // SET LOCAL vale apenas nesta transacao: nao altera o banco nem outras consultas.
      client = await this.pool.connect();
      client.on('error', handleClientError);
      await client.query('BEGIN READ ONLY');
      await client.query('SET LOCAL enable_indexscan = off');
      const result = await client.query<T>(text, values);
      await client.query('COMMIT');
      return result.rows;
    } catch (error) {
      if (client) {
        try { await client.query('ROLLBACK'); }
        catch { discardConnection = true; }
      }
      console.error('Erro ao consultar banco KMM:', error);
      throw new InternalServerErrorException(
        'Nao foi possivel consultar o banco KMM.',
      );
    } finally {
      client?.removeListener('error', handleClientError);
      if (discardConnection) client?.release(true);
      else client?.release();
    }
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
