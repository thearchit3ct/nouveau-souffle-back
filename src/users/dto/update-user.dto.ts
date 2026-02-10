import {
  IsOptional,
  IsString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'Jean' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  firstName?: string;

  @ApiPropertyOptional({ example: 'Dupont' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional({ example: '+33612345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ enum: ['M', 'MME', 'AUTRE'] })
  @IsOptional()
  @IsEnum(['M', 'MME', 'AUTRE'])
  civility?: string;

  @ApiPropertyOptional({ example: '10 rue de la Paix' })
  @IsOptional()
  @IsString()
  addressLine1?: string;

  @ApiPropertyOptional({ example: 'Batiment A' })
  @IsOptional()
  @IsString()
  addressLine2?: string;

  @ApiPropertyOptional({ example: '75001' })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({ example: 'Paris' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'FR' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: '1990-01-15', description: 'Date de naissance (ISO 8601)' })
  @IsOptional()
  @IsString()
  birthDate?: string;
}
