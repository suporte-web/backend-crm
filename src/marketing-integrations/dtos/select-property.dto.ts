import { IsString, Matches, MaxLength } from 'class-validator';

export class SelectPropertyDto {
  @IsString()
  @Matches(/^\d+$/)
  @MaxLength(30)
  propertyId!: string;
}
