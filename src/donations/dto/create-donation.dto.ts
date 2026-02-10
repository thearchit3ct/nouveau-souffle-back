import {
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDonationDto {
  @ApiProperty({ description: 'Donation amount', minimum: 5, maximum: 50000 })
  @IsNotEmpty()
  @IsNumber()
  @Min(5)
  @Max(50000)
  amount!: number;

  @ApiProperty({ enum: ['ONE_TIME', 'RECURRING'] })
  @IsNotEmpty()
  @IsEnum(['ONE_TIME', 'RECURRING'] as const)
  type!: 'ONE_TIME' | 'RECURRING';

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
}
