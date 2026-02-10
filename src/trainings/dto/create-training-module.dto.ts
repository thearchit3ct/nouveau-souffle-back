import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTrainingModuleDto {
  @ApiProperty({ description: 'Module title' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({ enum: ['VIDEO', 'PDF', 'QUIZ', 'TEXT'], default: 'TEXT' })
  @IsOptional()
  @IsEnum(['VIDEO', 'PDF', 'QUIZ', 'TEXT'] as const)
  type?: string;

  @ApiPropertyOptional({ description: 'Module content (text/HTML)' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({ description: 'File URL for VIDEO/PDF modules' })
  @IsOptional()
  @IsString()
  fileUrl?: string;

  @ApiPropertyOptional({ description: 'Module duration in minutes' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  duration?: number;

  @ApiPropertyOptional({ description: 'Display order', default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;
}
