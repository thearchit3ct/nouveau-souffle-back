import {
  IsNotEmpty,
  IsNumber,
  IsEmail,
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDonationIntentDto {
  @ApiProperty({ description: 'Donation amount in EUR', minimum: 5, maximum: 50000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(5)
  @Max(50000)
  amount!: number;

  @ApiProperty({ description: 'Donor email address' })
  @IsNotEmpty()
  @IsEmail()
  donorEmail!: string;

  @ApiProperty({ description: 'Donor first name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  donorFirstName!: string;

  @ApiProperty({ description: 'Donor last name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  donorLastName!: string;

  @ApiPropertyOptional({ description: 'Project to donate to' })
  @IsOptional()
  @IsUUID()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Anonymous donation', default: false })
  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @ApiPropertyOptional({ description: 'Request a tax receipt', default: true })
  @IsOptional()
  @IsBoolean()
  receiptRequested?: boolean;

  @ApiPropertyOptional({ description: 'Donor address' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  donorAddress?: string;

  @ApiPropertyOptional({ description: 'Donor postal code' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  donorPostalCode?: string;

  @ApiPropertyOptional({ description: 'Donor city' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  donorCity?: string;
}
