import { IsOptional, IsString } from 'class-validator';
import { CreateQuoteDto } from './create-quote.dto';

export class CreateInternalQuoteDto extends CreateQuoteDto {
  @IsOptional()
  @IsString()
  clientId?: string;

  @IsOptional()
  @IsString()
  prospectId?: string;
}
