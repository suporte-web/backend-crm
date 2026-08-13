
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsString,
  Matches,
} from 'class-validator';

export class ConsultarEntregasPorPlacaDto {
    @ApiProperty({
    description: 'Placa do veículo para consulta das entregas.',
    example: 'ABC1234',
    required: true,
  })

  @IsString({
    message: 'A placa deve ser um texto.',
  })
  @IsNotEmpty({
    message: 'A placa é obrigatória.',
  })
  @Transform(({ value }) =>
    String(value)
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, ''),
  )
  @Matches(/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/, {
    message:
      'Informe uma placa válida, como ABC1234 ou ABC1D23.',
  })
  placa: string;
}