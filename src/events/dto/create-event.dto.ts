import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({ description: 'Event title' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({ description: 'Event description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['CONFERENCE', 'FORMATION', 'COLLECTE', 'AG', 'SOCIAL', 'WORKSHOP', 'OTHER'] })
  @IsOptional()
  @IsEnum(['CONFERENCE', 'FORMATION', 'COLLECTE', 'AG', 'SOCIAL', 'WORKSHOP', 'OTHER'] as const)
  type?: string;

  @ApiPropertyOptional({ enum: ['PUBLIC', 'MEMBERS', 'PRIVATE'] })
  @IsOptional()
  @IsEnum(['PUBLIC', 'MEMBERS', 'PRIVATE'] as const)
  visibility?: string;

  @ApiProperty({ description: 'Start date/time (ISO)' })
  @IsNotEmpty()
  @IsDateString()
  startDatetime!: string;

  @ApiPropertyOptional({ description: 'End date/time (ISO)' })
  @IsOptional()
  @IsDateString()
  endDatetime?: string;

  @ApiPropertyOptional({ description: 'Location name' })
  @IsOptional()
  @IsString()
  locationName?: string;

  @ApiPropertyOptional({ description: 'Location address' })
  @IsOptional()
  @IsString()
  locationAddress?: string;

  @ApiPropertyOptional({ description: 'Max capacity' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  capacity?: number;

  @ApiPropertyOptional({ description: 'Event price', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiPropertyOptional({ description: 'Free event', default: true })
  @IsOptional()
  @IsBoolean()
  isFree?: boolean;

  @ApiPropertyOptional({ description: 'Cover image URL' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Event program details' })
  @IsOptional()
  @IsString()
  program?: string;
}
