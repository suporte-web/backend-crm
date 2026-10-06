import { Transform } from 'class-transformer';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StatusInformativo } from '@prisma/client';

export class ListarAssinantesDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(254)
  q?: string;

  @IsOptional()
  @IsEnum(StatusInformativo)
  status?: StatusInformativo;
}
