import { IsEnum } from "class-validator";

export enum OpportunityStatusDto {
  OPEN = "OPEN",
  WON = "WON",
  LOST = "LOST",
}

export class UpdateOpportunityStatusDto {
  @IsEnum(OpportunityStatusDto, {
    message: "O status deve ser OPEN, WON ou LOST.",
  })
  status: OpportunityStatusDto;
}