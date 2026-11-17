import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const config = new DocumentBuilder()
    .setTitle('API CRM - Pizzattolog')
    .setDescription(
      'API do CRM e do portal do cliente da Pizzattolog. ' +
        'Nas operações protegidas, utilize Authorize com o token JWT retornado pelo login. ' +
        'As permissões dependem dos perfis do usuário e do acesso ao registro.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api', app, document);

  return document;
}
