import { ApiPropertyOptional } from '@nestjs/swagger';
import { AuditLogAction, AuditLogCategory, AuditLogLevel } from '@prisma/client';
import { IsEnum, IsOptional, IsString, Matches } from 'class-validator';

export class QueryAuditLogsDto {
  @ApiPropertyOptional({ example: '2026-04-01' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateFrom?: string;

  @ApiPropertyOptional({ example: '2026-04-27' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  dateTo?: string;

  @ApiPropertyOptional({ enum: AuditLogCategory })
  @IsOptional()
  @IsEnum(AuditLogCategory)
  category?: AuditLogCategory;

  @ApiPropertyOptional({ enum: AuditLogAction })
  @IsOptional()
  @IsEnum(AuditLogAction)
  action?: AuditLogAction;

  @ApiPropertyOptional({ enum: AuditLogLevel })
  @IsOptional()
  @IsEnum(AuditLogLevel)
  level?: AuditLogLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  success?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: '250' })
  @IsOptional()
  @IsString()
  take?: string;
}
