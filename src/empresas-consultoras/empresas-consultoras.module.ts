import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EmpresasConsultorasController } from './empresas-consultoras.controller';
import { EmpresasConsultorasService } from './empresas-consultoras.service';

@Module({ imports: [PrismaModule], controllers: [EmpresasConsultorasController], providers: [EmpresasConsultorasService] })
export class EmpresasConsultorasModule {}
