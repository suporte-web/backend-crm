import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class RoleScreenPermissionDto {
  @IsString()
  @MinLength(1)
  screenKey!: string;

  @IsOptional()
  @IsString()
  screenLabel?: string;

  @IsBoolean()
  isEnabled!: boolean;
}

export class UpdateRoleScreenPermissionsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoleScreenPermissionDto)
  screens!: RoleScreenPermissionDto[];
}
