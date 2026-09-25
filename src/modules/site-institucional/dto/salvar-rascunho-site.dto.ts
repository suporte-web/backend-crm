import {
  IsNotEmpty,
  IsObject,
  IsString,
} from 'class-validator';

export class SalvarRascunhoSiteDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsObject()
  conteudo: Record<string, unknown>;
}