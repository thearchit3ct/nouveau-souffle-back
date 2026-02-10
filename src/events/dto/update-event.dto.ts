import { PartialType } from '@nestjs/swagger';
import { CreateEventDto } from './create-event.dto.js';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({ enum: ['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'ONGOING', 'COMPLETED', 'CANCELED'] as const)
  status?: string;
}
