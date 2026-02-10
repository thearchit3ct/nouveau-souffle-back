import { IsString, IsOptional, IsInt, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReferralStructureDto {
  @ApiProperty({ description: 'Nom de la structure' })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Type: CHU, CHRS, LHSS, CADA, ACCUEIL_JOUR, SANTE, SOCIAL, JURIDIQUE' })
  @IsString()
  type!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() website?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() openingHours?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() capacity?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() admissionCriteria?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() latitude?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() longitude?: number;
}

export class UpdateReferralStructureDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() type?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() address?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() phone?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() email?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() website?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() openingHours?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() capacity?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() admissionCriteria?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() latitude?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() longitude?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}
