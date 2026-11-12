import { DadosPerdaDto } from '../../oportunidades/dto/dados-perda.dto';
import { IsEnum } from "class-validator";

export enum OpportunityStatusDto {
  OPEN = "OPEN",
  WON = "WON",
  LOST = "LOST",
}

export class UpdateOpportunityStatusDto extends DadosPerdaDto {
  @IsEnum(OpportunityStatusDto, {
    message: "O status deve ser OPEN, WON ou LOST.",
  })
  status: OpportunityStatusDto;
}