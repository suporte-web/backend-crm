import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class EncaminharCotacaoSiteDto {
  @IsUUID()
  responsavelId!: string;
}

export class ReprovarCotacaoSiteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  motivo!: string;
}
