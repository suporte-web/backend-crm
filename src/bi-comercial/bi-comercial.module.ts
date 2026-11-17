import { Module } from '@nestjs/common';
import { BiComercialController } from './bi-comercial.controller';
import { BiComercialService } from './bi-comercial.service';

@Module({ controllers: [BiComercialController], providers: [BiComercialService] })
export class BiComercialModule {}
