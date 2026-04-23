import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadsDir = join(process.cwd(), 'uploads');
  const portalContentUploadsDir = join(uploadsDir, 'portal-content');
  const leadImportsDir = join(uploadsDir, 'lead-imports');

  if (!existsSync(portalContentUploadsDir)) {
    mkdirSync(portalContentUploadsDir, { recursive: true });
  }

  if (!existsSync(leadImportsDir)) {
    mkdirSync(leadImportsDir, { recursive: true });
  }

  app.enableCors({
    origin: 'http://localhost:3000',
    credentials: true,
  });

  app.use('/uploads', express.static(uploadsDir));

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  setupSwagger(app);

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
