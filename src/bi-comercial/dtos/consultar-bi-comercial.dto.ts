import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class ConsultarBiComercialDto {
  @IsOptional()
  @IsUUID()
  responsavelId?: string;

  @IsOptional()
  @IsIn(['true'])
  semResponsavel?: 'true';
}
