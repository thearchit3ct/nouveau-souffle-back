import { IsString, IsOptional, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuickEncounterDto {
  @ApiProperty({ description: 'ID de la maraude' })
  @IsString()
  maraudeId!: string;

  @ApiProperty({ required: false, description: 'ID du beneficiaire (null = anonyme)' })
  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @ApiProperty({ required: false, description: 'Surnom pour nouveau beneficiaire rapide' })
  @IsOptional()
  @IsString()
  newBeneficiaryNickname?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  locationLat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  locationLng?: number;

  @ApiProperty({ required: false, type: [String], description: 'Codes des besoins principaux' })
  @IsOptional()
  @IsArray()
  needCodes?: string[];

  @ApiProperty({ required: false, type: [String], description: 'Codes des actions realisees' })
  @IsOptional()
  @IsArray()
  actionCodes?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;
}
