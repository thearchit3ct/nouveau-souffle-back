import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAssignmentDto {
  @ApiProperty({ required: false, description: 'ID de l\'evenement (optionnel)' })
  @IsOptional()
  @IsString()
  eventId?: string;

  @ApiProperty({ required: false, description: 'ID du projet (optionnel)' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ required: false, description: 'Role du benevole pour cette mission' })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiProperty({ required: false, description: 'Notes sur la mission' })
  @IsOptional()
  @IsString()
  notes?: string;
}
