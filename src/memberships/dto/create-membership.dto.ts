import { IsNotEmpty, IsString, IsNumber, IsOptional, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateMembershipDto {
  @ApiProperty({ description: 'Membership type ID' })
  @IsNotEmpty()
  @IsUUID()
  membershipTypeId!: string;

  @ApiProperty({ description: 'Amount paid', minimum: 0 })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amountPaid!: number;

  @ApiPropertyOptional({ description: 'Secondary user ID (couple membership)' })
  @IsOptional()
  @IsUUID()
  secondaryUserId?: string;
}
