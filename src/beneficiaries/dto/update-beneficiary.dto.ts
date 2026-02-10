import { IsString, IsOptional, IsInt, IsDateString, IsBoolean, IsNumber, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateBeneficiaryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() nickname?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() firstName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() lastName?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() estimatedAge?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsDateString() dateOfBirth?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() gender?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() nationality?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() spokenLanguages?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsString() housingStatus?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() administrativeStatus?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() hasEmployment?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() healthNotes?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() hasPets?: boolean;
  @ApiProperty({ required: false }) @IsOptional() @IsString() petDetails?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() usualLocation?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() usualLocationLat?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsNumber() usualLocationLng?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsString() gdprConsentStatus?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() notes?: string;
  @ApiProperty({ required: false, type: [String] }) @IsOptional() @IsArray() tags?: string[];
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() photoConsentGiven?: boolean;
}
