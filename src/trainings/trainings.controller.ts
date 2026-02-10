import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { TrainingsService } from './trainings.service.js';
import { CreateTrainingDto } from './dto/create-training.dto.js';
import { UpdateTrainingDto } from './dto/update-training.dto.js';
import { CreateTrainingModuleDto } from './dto/create-training-module.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('trainings')
@Controller('api/v1/trainings')
export class TrainingsController {
  constructor(private readonly trainingsService: TrainingsService) {}

  // ---- Specific routes FIRST (before parameterized :slug / :id) ----

  @Get('admin')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all trainings including drafts (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, enum: ['DRAFT', 'PUBLISHED', 'ARCHIVED'] })
  @ApiResponse({ status: 200, description: 'Paginated trainings (all statuses)' })
  async findAllAdmin(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.trainingsService.findAllAdmin(pageNum, limitNum, status);
  }

  @Get('stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Training statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Training stats' })
  async getStats() {
    return this.trainingsService.getStats();
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'My training enrollments' })
  @ApiResponse({ status: 200, description: 'List of enrollments' })
  async getMyEnrollments(@CurrentUser() user: CurrentUserPayload) {
    return this.trainingsService.getMyEnrollments(user.userId);
  }

  @Patch('modules/:moduleId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a training module (admin)' })
  @ApiResponse({ status: 200, description: 'Module updated' })
  async updateModule(
    @Param('moduleId') moduleId: string,
    @Body() dto: CreateTrainingModuleDto,
  ) {
    return this.trainingsService.updateModule(moduleId, dto);
  }

  @Delete('modules/:moduleId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a training module (admin)' })
  @ApiResponse({ status: 200, description: 'Module deleted' })
  async removeModule(@Param('moduleId') moduleId: string) {
    return this.trainingsService.removeModule(moduleId);
  }

  @Post('enrollments/:enrollmentId/modules/:moduleId/complete')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark a module as completed' })
  @ApiResponse({ status: 201, description: 'Module completion recorded' })
  async completeModule(
    @Param('enrollmentId') enrollmentId: string,
    @Param('moduleId') moduleId: string,
  ) {
    return this.trainingsService.completeModule(enrollmentId, moduleId);
  }

  // ---- Public / generic routes ----

  @Get()
  @ApiOperation({ summary: 'List published trainings (public)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated published trainings' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.trainingsService.findAll(pageNum, limitNum);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a training (admin)' })
  @ApiResponse({ status: 201, description: 'Training created' })
  async create(@Body() dto: CreateTrainingDto) {
    return this.trainingsService.create(dto);
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get training by slug (public)' })
  @ApiResponse({ status: 200, description: 'Training detail with modules' })
  async findOneBySlug(@Param('slug') slug: string) {
    return this.trainingsService.findOneBySlug(slug);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a training (admin)' })
  @ApiResponse({ status: 200, description: 'Training updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateTrainingDto) {
    return this.trainingsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a training (admin)' })
  @ApiResponse({ status: 200, description: 'Training deleted' })
  async remove(@Param('id') id: string) {
    return this.trainingsService.remove(id);
  }

  @Post(':id/modules')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add a module to a training (admin)' })
  @ApiResponse({ status: 201, description: 'Module created' })
  async addModule(
    @Param('id') id: string,
    @Body() dto: CreateTrainingModuleDto,
  ) {
    return this.trainingsService.addModule(id, dto);
  }

  @Post(':id/enroll')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enroll in a training' })
  @ApiResponse({ status: 201, description: 'Enrollment created' })
  @ApiResponse({ status: 400, description: 'Already enrolled or training unavailable' })
  async enroll(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.trainingsService.enroll(id, user.userId);
  }

  @Get(':id/enrollment')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my enrollment for a training' })
  @ApiResponse({ status: 200, description: 'Enrollment with completions' })
  async getEnrollment(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.trainingsService.getEnrollment(id, user.userId);
  }
}
