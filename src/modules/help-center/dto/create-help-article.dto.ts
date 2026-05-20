import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateHelpArticleDto {
  @IsString()
  @MaxLength(160)
  title!: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  @MaxLength(220, { each: true })
  questions!: string[];

  @IsString()
  @MaxLength(4000)
  answer!: string;

  @IsString()
  @MaxLength(120)
  category!: string;

  @IsArray()
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  tags!: string[];

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
