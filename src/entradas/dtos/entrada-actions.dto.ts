import { IsOptional, IsString, IsUUID } from 'class-validator';

export class EntradaNoteDto {
  @IsOptional()
  @IsString()
  note?: string;
}

export class TransferEntradaDto {
  @IsOptional()
  @IsUUID()
  responsavelId?: string;
}
