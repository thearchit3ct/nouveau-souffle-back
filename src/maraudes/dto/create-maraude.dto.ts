import { IsString, IsOptional, IsDateString, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaraudeDto {
  @ApiProperty({ required: false, description: 'Zone ID' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiProperty({ required: false, description: 'Titre de la maraude' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, description: 'Description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Date/heure de debut prevue (ISO 8601)' })
  @IsDateString()
  plannedStartAt!: string;

  @ApiProperty({ required: false, description: 'Date/heure de fin prevue (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  plannedEndAt?: string;

  @ApiProperty({ required: false, description: 'Nom du lieu de depart' })
  @IsOptional()
  @IsString()
  startLocationName?: string;

  @ApiProperty({ required: false, description: 'Latitude du lieu de depart' })
  @IsOptional()
  @IsNumber()
  startLocationLat?: number;

  @ApiProperty({ required: false, description: 'Longitude du lieu de depart' })
  @IsOptional()
  @IsNumber()
  startLocationLng?: number;

  @ApiProperty({ required: false, description: 'Info vehicule' })
  @IsOptional()
  @IsString()
  vehicleInfo?: string;
}
