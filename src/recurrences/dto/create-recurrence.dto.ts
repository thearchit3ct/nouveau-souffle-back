import { IsNumber, IsEnum, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateRecurrenceDto {
  @ApiProperty({ description: 'Amount in cents', example: 2000 })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({ enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'] })
  @IsEnum(['MONTHLY', 'QUARTERLY', 'YEARLY'] as const)
  frequency: 'MONTHLY' | 'QUARTERLY' | 'YEARLY';

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: 'Stripe payment method ID' })
  @IsString()
  paymentMethodId: string;
}
