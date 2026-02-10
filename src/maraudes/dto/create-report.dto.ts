import { IsString, IsOptional, IsInt, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReportDto {
  @ApiProperty({ required: false }) @IsOptional() @IsInt() mealsDistributed?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() blanketsDistributed?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() hygieneKitsDistributed?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsObject() otherDistributions?: Record<string, number>;
  @ApiProperty({ required: false }) @IsOptional() @IsString() summary?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() pointsOfAttention?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() positiveHighlights?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() suggestions?: string;
}
