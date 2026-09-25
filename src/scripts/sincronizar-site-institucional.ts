import { NestFactory } from '@nestjs/core';

import { AppModule } from '../app.module';
import { SiteInstitucionalService } from '../modules/site-institucional/site-institucional.service';

async function main() {
  const app =
    await NestFactory.createApplicationContext(
      AppModule,
      {
        logger: ['error', 'warn', 'log'],
      },
    );

  try {
    const service =
      app.get(SiteInstitucionalService);

    const paginas =
      await service.sincronizarConteudoAtualDoSite();

    console.log(
      `Conteúdo do site institucional sincronizado: ${paginas.length} páginas publicadas.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error) => {
  console.error(
    'Erro ao sincronizar o conteúdo do site institucional.',
    error,
  );

  process.exitCode = 1;
});
