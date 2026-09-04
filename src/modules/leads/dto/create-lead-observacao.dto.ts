import {
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateLeadObservacaoDto {
  @IsString()
  @IsNotEmpty({
    message: 'Informe a observação.',
  })
  @MaxLength(3000, {
    message: 'A observação deve ter no máximo 3000 caracteres.',
  })
  content: string;

  
}


 

