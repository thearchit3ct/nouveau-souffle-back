import { IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRecurrenceDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  @Min(100)
  amount?: number;
}
