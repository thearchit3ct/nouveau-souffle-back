import { IsString, IsOptional, IsNumber, IsInt, IsArray, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEncounterDto {
  @ApiProperty({ description: 'ID de la maraude' })
  @IsString()
  maraudeId!: string;

  @ApiProperty({ required: false, description: 'ID du beneficiaire (null = anonyme)' })
  @IsOptional()
  @IsString()
  beneficiaryId?: string;

  @ApiProperty({ required: false, enum: ['FIRST_CONTACT', 'FOLLOW_UP', 'EMERGENCY', 'CHECK_IN', 'REFERRAL_ONLY'], default: 'FIRST_CONTACT' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiProperty({ required: false, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'LOW' })
  @IsOptional()
  @IsString()
  urgencyLevel?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  locationLat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  locationLng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  physicalState?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  mentalState?: string;

  @ApiProperty({ required: false, description: 'seul, groupe, famille' })
  @IsOptional()
  @IsString()
  socialContext?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false, description: 'Notes privees (acces restreint)' })
  @IsOptional()
  @IsString()
  privateNotes?: string;

  @ApiProperty({ required: false, description: 'Items distribues (JSON)' })
  @IsOptional()
  @IsObject()
  itemsDistributed?: Record<string, number>;

  @ApiProperty({ required: false, description: 'Duree en minutes' })
  @IsOptional()
  @IsInt()
  durationMinutes?: number;

  @ApiProperty({ required: false, type: [String], description: 'IDs des categories de besoins' })
  @IsOptional()
  @IsArray()
  needCategoryIds?: string[];

  @ApiProperty({ required: false, type: [String], description: 'IDs des categories d\'actions' })
  @IsOptional()
  @IsArray()
  actionCategoryIds?: string[];
}
