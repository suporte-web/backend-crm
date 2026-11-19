import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ImportacoesCadastrosController } from './importacoes-cadastros.controller';
import { ImportacoesCadastrosService } from './importacoes-cadastros.service';
@Module({ imports: [PrismaModule], controllers: [ImportacoesCadastrosController], providers: [ImportacoesCadastrosService] })
export class ImportacoesCadastrosModule {}
