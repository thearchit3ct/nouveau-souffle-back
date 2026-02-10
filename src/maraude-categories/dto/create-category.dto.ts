import { IsString, IsOptional, IsInt, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateNeedCategoryDto {
  @ApiProperty({ description: 'Code unique (HOUSING, FOOD, HEALTH, HYGIENE, ADMIN, LEGAL...)' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Nom affiche' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() icon?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() color?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() parentId?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() displayOrder?: number;
}

export class CreateActionCategoryDto {
  @ApiProperty({ description: 'Code unique (FOOD_DISTRIBUTION, BLANKET, LISTENING, FIRST_AID...)' })
  @IsString()
  code!: string;

  @ApiProperty({ description: 'Nom affiche' })
  @IsString()
  name!: string;

  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() icon?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() color?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() displayOrder?: number;
}

export class UpdateCategoryDto {
  @ApiProperty({ required: false }) @IsOptional() @IsString() name?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() description?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() icon?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsString() color?: string;
  @ApiProperty({ required: false }) @IsOptional() @IsInt() displayOrder?: number;
  @ApiProperty({ required: false }) @IsOptional() @IsBoolean() isActive?: boolean;
}
