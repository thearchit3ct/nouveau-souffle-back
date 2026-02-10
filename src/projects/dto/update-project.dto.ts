import { PartialType } from '@nestjs/swagger';
import { CreateProjectDto } from './create-project.dto.js';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProjectDto extends PartialType(CreateProjectDto) {
  @ApiPropertyOptional({ enum: ['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] })
  @IsOptional()
  @IsEnum(['DRAFT', 'ACTIVE', 'COMPLETED', 'ARCHIVED'] as const)
  status?: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
}
