import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateZoneDto {
  @ApiProperty({ description: 'Nom de la zone' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false, description: 'Couleur hex (ex: #FF5733)' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  centerLng?: number;

  @ApiProperty({ required: false, description: 'Rayon en km' })
  @IsOptional()
  @IsNumber()
  radiusKm?: number;
}

export class UpdateZoneDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  centerLat?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  centerLng?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  radiusKm?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
