import { ContentType } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional, IsString, IsUrl } from 'class-validator';

export class CreatePortalContentDto {
  @IsString()
  title!: string;

  @IsString()
  summary!: string;

  @IsString()
  body!: string;

  @IsEnum(ContentType)
  type!: ContentType;

  @IsOptional()
  @IsUrl()
  coverImageUrl?: string;

  @IsOptional()
  @IsUrl()
  videoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
