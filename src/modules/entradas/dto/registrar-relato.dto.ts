import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

const limpar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
export const estadosBrasileiros = [
  'AC',
  'AL',
  'AP',
  'AM',
  'BA',
  'CE',
  'DF',
  'ES',
  'GO',
  'MA',
  'MT',
  'MS',
  'MG',
  'PA',
  'PB',
  'PR',
  'PE',
  'PI',
  'RJ',
  'RN',
  'RS',
  'RO',
  'RR',
  'SC',
  'SP',
  'SE',
  'TO',
];

export class RegistrarRelatoDto {
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(150) empresa?: string;
  @IsOptional() @Transform(limpar) @IsString() @MaxLength(150) cidade?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(150)
  tipoReclamacao?: string;
  @IsOptional()
  @Transform(limpar)
  @IsString()
  @MaxLength(150)
  documento?: string;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value) as unknown;
    } catch {
      return value;
    }
  })
  @IsArray()
  @ArrayMaxSize(5)
  @IsString({ each: true })
  @MaxLength(1000, { each: true })
  comentariosAnexos?: string[];
  @IsUUID() identificador!: string;
  @Transform(limpar) @IsString() @MinLength(3) @MaxLength(150) nome!: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.replace(/[()+.\-\s]/g, '') : value,
  )
  @Matches(/^\d{10,13}$/)
  telefone!: string;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  email!: string;
  @IsIn(estadosBrasileiros) estado!: string;
  @IsIn(['RECLAMACAO', 'ELOGIO']) tipo!: 'RECLAMACAO' | 'ELOGIO';
  @Transform(limpar)
  @IsString()
  @MinLength(10)
  @MaxLength(10000)
  relato!: string;
}
