import { IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVolunteerDto {
  @ApiProperty({ required: false, description: 'Notes du coordinateur' })
  @IsOptional()
  @IsString()
  coordinatorNotes?: string;

  @ApiProperty({ required: false, type: [String], description: 'Competences mises a jour' })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiProperty({
    required: false,
    type: Object,
    description: 'Disponibilites mises a jour',
  })
  @IsOptional()
  availabilities?: Record<string, string[]>;
}
