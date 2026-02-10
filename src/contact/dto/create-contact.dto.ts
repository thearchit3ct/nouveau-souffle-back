import {
  IsNotEmpty,
  IsEmail,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateContactDto {
  @ApiProperty({ description: 'Sender name' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiProperty({ description: 'Sender email' })
  @IsNotEmpty()
  @IsEmail()
  email!: string;

  @ApiProperty({ description: 'Message subject' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  subject!: string;

  @ApiProperty({ description: 'Message body' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(5000)
  message!: string;
}
