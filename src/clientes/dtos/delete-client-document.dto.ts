import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class DeleteClientDocumentDto {
  @IsString()
  @IsNotEmpty({ message: 'A justificativa é obrigatória.' })
  @MaxLength(500, {
    message: 'A justificativa deve ter no máximo 500 caracteres.',
  })
  justification: string;
}