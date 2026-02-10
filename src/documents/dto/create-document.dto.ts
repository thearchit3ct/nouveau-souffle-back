import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateDocumentDto {
  @ApiProperty({ description: 'Titre du document' })
  @IsString()
  title!: string;

  @ApiProperty({ required: false, description: 'Description du document' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, enum: ['PUBLIC', 'MEMBERS', 'ADMIN'], default: 'MEMBERS' })
  @IsOptional()
  @IsString()
  visibility?: string;

  @ApiProperty({ required: false, enum: ['GUIDE', 'REPORT', 'FORM', 'MEETING_MINUTES', 'STATUTES', 'TRAINING', 'OTHER'], default: 'OTHER' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false, type: [String], default: [] })
  @IsOptional()
  @IsArray()
  tags?: string[];
}
