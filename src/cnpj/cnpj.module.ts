import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import axios from 'axios';
import { CNPJ_HTTP, CnpjHttp } from './cnpj.types';
import { CnpjController } from './cnpj.controller';
import { CnpjService } from './cnpj.service';

@Module({
  imports: [ConfigModule],
  controllers: [CnpjController],
  providers: [CnpjService, {
    provide: CNPJ_HTTP,
    useFactory: (): CnpjHttp => async (url, timeout) => {
      const response = await axios.get<unknown>(url, {
        timeout, signal: AbortSignal.timeout(timeout), maxRedirects: 0,
        maxContentLength: 1024 * 1024, maxBodyLength: 1024 * 1024,
        validateStatus: () => true, headers: { Accept: 'application/json' },
      });
      return { status: response.status, data: response.data, headers: response.headers };
    },
  }],
  exports: [CnpjService],
})
export class CnpjModule {}
