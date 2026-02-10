import { IsString, IsOptional, IsDateString, IsNumber, IsObject } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateMaraudeDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  plannedStartAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsDateString()
  plannedEndAt?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  startLocationName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  startLocationLat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  startLocationLng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  weatherConditions?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  temperatureCelsius?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  generalObservations?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  vehicleInfo?: string;

  @ApiProperty({ required: false, description: 'Fournitures distribuees (JSON)' })
  @IsOptional()
  @IsObject()
  suppliesDistributed?: Record<string, number>;
}
