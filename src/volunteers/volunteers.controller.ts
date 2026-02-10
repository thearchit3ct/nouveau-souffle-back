import {
  Controller,
  Get,
  Post,
  Patch,
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
import { VolunteersService } from './volunteers.service.js';
import { CreateVolunteerDto } from './dto/create-volunteer.dto.js';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('volunteers')
@Controller('api/v1/volunteers')
export class VolunteersController {
  constructor(private readonly volunteersService: VolunteersService) {}

  // --- Public endpoint ---

  @Post()
  @ApiOperation({ summary: 'Apply as a volunteer (public)' })
  @ApiResponse({ status: 201, description: 'Volunteer application created' })
  @ApiResponse({ status: 400, description: 'Application already exists' })
  async apply(@Body() dto: CreateVolunteerDto) {
    return this.volunteersService.apply(dto);
  }

  // --- Authenticated volunteer endpoint (MUST be before :id routes) ---

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my volunteer profile' })
  @ApiResponse({ status: 200, description: 'Volunteer profile' })
  @ApiResponse({ status: 404, description: 'No volunteer profile linked' })
  async getMyProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.volunteersService.getMyProfile(user.userId);
  }

  // --- Admin/Coordinator endpoints ---

  @Get()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List volunteers (admin/coordinator)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String, description: 'PENDING, APPROVED, REJECTED, PAUSED' })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Search on firstName, lastName, email' })
  @ApiResponse({ status: 200, description: 'Paginated volunteers list' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.volunteersService.findAll(pageNum, limitNum, status, search);
  }

  @Get(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get volunteer by ID (admin/coordinator)' })
  @ApiResponse({ status: 200, description: 'Volunteer details' })
  @ApiResponse({ status: 404, description: 'Volunteer not found' })
  async findOne(@Param('id') id: string) {
    return this.volunteersService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update volunteer (admin/coordinator)' })
  @ApiResponse({ status: 200, description: 'Volunteer updated' })
  @ApiResponse({ status: 404, description: 'Volunteer not found' })
  async update(@Param('id') id: string, @Body() dto: UpdateVolunteerDto) {
    return this.volunteersService.update(id, dto);
  }

  @Patch(':id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Approve volunteer application (admin/coordinator)' })
  @ApiResponse({ status: 200, description: 'Volunteer approved' })
  @ApiResponse({ status: 404, description: 'Volunteer not found' })
  @ApiResponse({ status: 400, description: 'Already approved or rejected' })
  async approve(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.volunteersService.approve(id, user.userId);
  }

  @Patch(':id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reject volunteer application (admin/coordinator)' })
  @ApiResponse({ status: 200, description: 'Volunteer rejected' })
  @ApiResponse({ status: 404, description: 'Volunteer not found' })
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.volunteersService.reject(id, user.userId);
  }

  @Patch(':id/pause')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause volunteer (admin/coordinator)' })
  @ApiResponse({ status: 200, description: 'Volunteer paused' })
  @ApiResponse({ status: 404, description: 'Volunteer not found' })
  @ApiResponse({ status: 400, description: 'Volunteer not in APPROVED status' })
  async pause(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.volunteersService.pause(id, user.userId);
  }

  @Post(':id/assignments')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Assign volunteer to event/project (admin/coordinator)' })
  @ApiResponse({ status: 201, description: 'Assignment created' })
  @ApiResponse({ status: 404, description: 'Volunteer, event, or project not found' })
  @ApiResponse({ status: 400, description: 'Volunteer not approved' })
  async createAssignment(
    @Param('id') id: string,
    @Body() dto: CreateAssignmentDto,
  ) {
    return this.volunteersService.createAssignment(id, dto);
  }

  @Get(':id/assignments')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List volunteer assignments' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated assignments' })
  async getAssignments(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.volunteersService.getAssignments(id, pageNum, limitNum);
  }

  @Patch('assignments/:assignmentId/complete')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark assignment as completed (admin/coordinator)' })
  @ApiResponse({ status: 200, description: 'Assignment completed' })
  @ApiResponse({ status: 404, description: 'Assignment not found' })
  @ApiResponse({ status: 400, description: 'Already completed' })
  async completeAssignment(@Param('assignmentId') assignmentId: string) {
    return this.volunteersService.completeAssignment(assignmentId);
  }
}
