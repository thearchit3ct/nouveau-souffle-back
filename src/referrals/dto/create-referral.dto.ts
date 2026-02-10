import { IsString, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReferralDto {
  @ApiProperty({ required: false, description: 'ID de la rencontre' })
  @IsOptional()
  @IsString()
  encounterId?: string;

  @ApiProperty({ description: 'ID du beneficiaire' })
  @IsString()
  beneficiaryId!: string;

  @ApiProperty({ required: false, description: 'ID de la structure partenaire' })
  @IsOptional()
  @IsString()
  structureId?: string;

  @ApiProperty({ required: false, description: 'Nom de la structure (si hors referentiel)' })
  @IsOptional()
  @IsString()
  structureName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;
}

export class UpdateReferralDto {
  @ApiProperty({ required: false, enum: ['PROPOSED', 'ACCEPTED', 'COMPLETED', 'REFUSED', 'NO_SHOW', 'EXPIRED'] })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  appointmentDate?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  followUpNotes?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}
