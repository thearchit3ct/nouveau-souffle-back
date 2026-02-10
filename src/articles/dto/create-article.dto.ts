import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsUUID,
  IsObject,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty({ description: 'Article title' })
  @IsNotEmpty()
  @IsString()
  title!: string;

  @ApiProperty({ description: 'Article content (HTML or Markdown)' })
  @IsNotEmpty()
  @IsString()
  content!: string;

  @ApiPropertyOptional({ description: 'Short excerpt', maxLength: 500 })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  excerpt?: string;

  @ApiPropertyOptional({ description: 'Featured image URL' })
  @IsOptional()
  @IsString()
  featuredImageUrl?: string;

  @ApiPropertyOptional({ description: 'Category IDs to associate', type: [String] })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @ApiPropertyOptional({ description: 'SEO metadata object' })
  @IsOptional()
  @IsObject()
  seoMetadata?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Enable comments', default: false })
  @IsOptional()
  @IsBoolean()
  commentsEnabled?: boolean;
}
