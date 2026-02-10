import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Body,
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
  ApiQuery,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser, CurrentUserPayload } from '../auth/current-user.decorator.js';
import { UploadService } from '../upload/upload.service.js';

const AVATAR_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_SIZE = 2 * 1024 * 1024; // 2MB

@ApiTags('users')
@Controller('api/v1/users')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly uploadService: UploadService,
  ) {}

  // ── Current user endpoints (must be before :id routes) ──

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user profile' })
  async getMe(@CurrentUser() currentUser: CurrentUserPayload) {
    return this.usersService.findOne(currentUser.userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  async updateMe(
    @CurrentUser() currentUser: CurrentUserPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.update(currentUser.userId, dto);
  }

  @Post('me/avatar')
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
  @ApiOperation({ summary: 'Upload avatar for current user' })
  @ApiResponse({ status: 201, description: 'Avatar uploaded' })
  async uploadAvatar(
    @CurrentUser() currentUser: CurrentUserPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }

    if (!AVATAR_MIMES.includes(file.mimetype)) {
      throw new BadRequestException(
        `Type de fichier invalide: ${file.mimetype}. Acceptes: ${AVATAR_MIMES.join(', ')}`,
      );
    }

    if (file.size > AVATAR_MAX_SIZE) {
      throw new BadRequestException(
        `Fichier trop volumineux: ${(file.size / 1024 / 1024).toFixed(1)}MB. Max: 2MB`,
      );
    }

    const result = await this.uploadService.uploadFile(file, 'avatars');
    const updated = await this.usersService.updateAvatar(
      currentUser.userId,
      result.url,
    );

    return updated;
  }

  // ── Admin endpoints ──

  @Get()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all users (admin only)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search by email, first name or last name' })
  @ApiQuery({ name: 'role', required: false, type: String, description: 'Filter by role' })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'Filter by status' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('role') role?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.usersService.findAll(pageNum, limitNum, search, role, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Updated user' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  @Patch(':id/role')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user role (admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { role: { type: 'string' } }, required: ['role'] } })
  @ApiResponse({ status: 200, description: 'Role updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateRole(
    @Param('id') id: string,
    @Body('role') role: string,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.usersService.updateRole(id, role, currentUser.userId);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Update user status (admin only)' })
  @ApiBody({ schema: { type: 'object', properties: { status: { type: 'string' } }, required: ['status'] } })
  @ApiResponse({ status: 200, description: 'Status updated' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: string,
    @CurrentUser() currentUser: CurrentUserPayload,
  ) {
    return this.usersService.updateStatus(id, status, currentUser.userId);
  }
}
