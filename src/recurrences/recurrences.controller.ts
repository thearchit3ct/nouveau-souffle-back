import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { RecurrencesService } from './recurrences.service.js';
import { CreateRecurrenceDto } from './dto/create-recurrence.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('recurrences')
@Controller('api/v1/recurrences')
@ApiBearerAuth()
export class RecurrencesController {
  constructor(private readonly recurrencesService: RecurrencesService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create a recurring donation' })
  @ApiResponse({ status: 201, description: 'Recurrence created with Stripe clientSecret' })
  @ApiResponse({ status: 400, description: 'Invalid input or inactive project' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateRecurrenceDto,
  ) {
    return this.recurrencesService.create(user.userId, dto);
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'List my recurring donations' })
  @ApiResponse({ status: 200, description: 'User recurrences' })
  async findMyRecurrences(@CurrentUser() user: CurrentUserPayload) {
    return this.recurrencesService.findMyRecurrences(user.userId);
  }

  @Get('stats')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Recurrence statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Recurrence stats' })
  async getStats() {
    return this.recurrencesService.getStats();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get a recurring donation by ID' })
  @ApiResponse({ status: 200, description: 'Recurrence details' })
  @ApiResponse({ status: 404, description: 'Recurrence not found' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const result = await this.recurrencesService.findOne(id);
    // Ownership or admin check
    const rec = result.data;
    if (
      rec.userId !== user.userId &&
      user.role !== 'ADMIN' &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException('Acces refuse');
    }
    return result;
  }

  @Patch(':id/pause')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Pause a recurring donation' })
  @ApiResponse({ status: 200, description: 'Recurrence paused' })
  @ApiResponse({ status: 400, description: 'Recurrence is not active' })
  async pause(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.recurrencesService.pause(id, user.userId);
  }

  @Patch(':id/resume')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Resume a paused recurring donation' })
  @ApiResponse({ status: 200, description: 'Recurrence resumed' })
  @ApiResponse({ status: 400, description: 'Recurrence is not paused' })
  async resume(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.recurrencesService.resume(id, user.userId);
  }

  @Patch(':id/cancel')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Cancel a recurring donation' })
  @ApiResponse({ status: 200, description: 'Recurrence canceled' })
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.recurrencesService.cancel(id, user.userId);
  }

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all recurring donations (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated recurrences' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.recurrencesService.findAll(pageNum, limitNum);
  }
}
