import { IsEmail, IsString, IsOptional, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVolunteerDto {
  @ApiProperty({ description: 'Email du benevole' })
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Prenom' })
  @IsString()
  firstName!: string;

  @ApiProperty({ description: 'Nom de famille' })
  @IsString()
  lastName!: string;

  @ApiProperty({ required: false, description: 'Telephone' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ type: [String], default: [], description: 'Competences du benevole' })
  @IsOptional()
  @IsArray()
  skills?: string[];

  @ApiProperty({
    required: false,
    type: Object,
    default: {},
    description: 'Disponibilites (ex: { "lundi": ["matin", "soir"] })',
  })
  @IsOptional()
  availabilities?: Record<string, string[]>;

  @ApiProperty({ required: false, description: 'Motivation du benevole' })
  @IsOptional()
  @IsString()
  motivation?: string;
}
