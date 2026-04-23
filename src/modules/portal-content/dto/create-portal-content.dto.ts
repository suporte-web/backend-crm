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
  @IsString()
  campaignName?: string;

  @IsOptional()
  @IsString()
  ctaLabel?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  ctaUrl?: string;

  @IsOptional()
  @IsBoolean()
  highlight?: boolean;

  @IsOptional()
  @IsUrl({ require_tld: false })
  coverImageUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  videoUrl?: string;

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
