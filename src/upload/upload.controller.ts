import {
  Controller,
  Post,
  Delete,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';
import { UploadService } from './upload.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

@ApiTags('uploads')
@Controller('api/v1/uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiQuery({ name: 'folder', required: false, type: String, description: 'Upload folder (default: articles)' })
  @ApiOperation({ summary: 'Upload a file (admin)' })
  @ApiResponse({ status: 201, description: 'File uploaded' })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Query('folder') folder?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: ${ALLOWED_MIMES.join(', ')}`,
      );
    }

    if (file.size > MAX_SIZE) {
      throw new BadRequestException(
        `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 5MB`,
      );
    }

    const result = await this.uploadService.uploadFile(file, folder || 'articles');

    return {
      data: {
        url: result.url,
        key: result.key,
        filename: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      },
    };
  }

  @Delete()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiQuery({ name: 'key', required: true, type: String, description: 'File key to delete' })
  @ApiOperation({ summary: 'Delete a file (admin)' })
  @ApiResponse({ status: 200, description: 'File deleted' })
  async remove(@Query('key') key: string) {
    if (!key) {
      throw new BadRequestException('File key is required');
    }
    const result = await this.uploadService.deleteFile(key);
    return { data: result };
  }
}
