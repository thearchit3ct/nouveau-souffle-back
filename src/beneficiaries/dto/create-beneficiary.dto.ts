import { IsString, IsOptional, IsInt, IsDateString, IsEnum, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBeneficiaryDto {
  @ApiProperty({ description: 'Surnom (identite principale)' })
  @IsString()
  nickname!: string;

  @ApiProperty({ required: false, description: 'Prenom (chiffre)' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false, description: 'Nom (chiffre)' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false, description: 'Age estime' })
  @IsOptional()
  @IsInt()
  estimatedAge?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiProperty({ required: false, enum: ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'], default: 'UNKNOWN' })
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  spokenLanguages?: string[];

  @ApiProperty({ required: false, enum: ['STREET', 'SHELTER', 'SQUAT', 'TEMPORARY', 'HOSTED', 'HOUSED', 'UNKNOWN'] })
  @IsOptional()
  @IsString()
  housingStatus?: string;

  @ApiProperty({ required: false, enum: ['REGULAR', 'ASYLUM_SEEKER', 'REFUGEE', 'UNDOCUMENTED', 'UNKNOWN', 'OTHER'] })
  @IsOptional()
  @IsString()
  administrativeStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasEmployment?: boolean;

  @ApiProperty({ required: false, description: 'Notes de sante (chiffre)' })
  @IsOptional()
  @IsString()
  healthNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  hasPets?: boolean;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  petDetails?: string;

  @ApiProperty({ required: false, description: 'Lieu habituel' })
  @IsOptional()
  @IsString()
  usualLocation?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  usualLocationLat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  usualLocationLng?: number;

  @ApiProperty({ required: false, enum: ['GIVEN', 'ORAL', 'VITAL', 'REFUSED', 'NOT_ASKED', 'WITHDRAWN'], default: 'NOT_ASKED' })
  @IsOptional()
  @IsString()
  gdprConsentStatus?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, type: [String] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}
