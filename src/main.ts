import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { AppModule } from './app.module';
import { setupSwagger } from './config/swagger';

function parseOrigins(value?: string): string[] {
  return (
    value
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? []
  );
}

function buildAllowedOrigins(): string[] {
  return Array.from(
    new Set([
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      ...parseOrigins(process.env.FRONTEND_URL),
      ...parseOrigins(process.env.CORS_ORIGIN),
    ]),
  );
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const uploadsDir = join(process.cwd(), 'uploads');
  const portalContentUploadsDir = join(uploadsDir, 'portal-content');
  const leadImportsDir = join(uploadsDir, 'lead-imports');
  const propostasUploadsDir = join(uploadsDir, 'propostas');

  if (!existsSync(portalContentUploadsDir)) {
    mkdirSync(portalContentUploadsDir, { recursive: true });
  }

  if (!existsSync(leadImportsDir)) {
    mkdirSync(leadImportsDir, { recursive: true });
  }

  if (!existsSync(propostasUploadsDir)) {
    mkdirSync(propostasUploadsDir, { recursive: true });
  }

  const allowedOrigins = buildAllowedOrigins();

  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
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

  await app.listen(process.env.PORT ?? 3001, process.env.HOST ?? '0.0.0.0');
}
bootstrap();
