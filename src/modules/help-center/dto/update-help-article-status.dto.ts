import { IsBoolean } from 'class-validator';

export class UpdateHelpArticleStatusDto {
  @IsBoolean()
  active!: boolean;
}
