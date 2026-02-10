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
import { MembershipsService } from './memberships.service.js';
import { CreateMembershipDto } from './dto/create-membership.dto.js';
import { ValidateMembershipDto } from './dto/validate-membership.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('memberships')
@Controller('api/v1')
@ApiBearerAuth()
export class MembershipsController {
  constructor(private readonly membershipsService: MembershipsService) {}

  @Get('membership-types')
  @ApiOperation({ summary: 'List active membership types (public)' })
  @ApiResponse({ status: 200, description: 'Active membership types' })
  async findTypes() {
    return this.membershipsService.findActiveTypes();
  }

  @Post('memberships')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Create membership request' })
  @ApiResponse({ status: 201, description: 'Membership request created' })
  async create(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateMembershipDto,
  ) {
    return this.membershipsService.create(user.userId, dto);
  }

  @Get('memberships/me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get my active membership' })
  @ApiResponse({ status: 200, description: 'Active membership' })
  async findMyActive(@CurrentUser() user: CurrentUserPayload) {
    return this.membershipsService.findMyActive(user.userId);
  }

  @Get('memberships')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'List all memberships (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated memberships' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.membershipsService.findAll(pageNum, limitNum, status);
  }

  @Get('memberships/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Get membership by ID (admin)' })
  @ApiResponse({ status: 200, description: 'Membership details' })
  async findOne(@Param('id') id: string) {
    return this.membershipsService.findOne(id);
  }

  @Patch('memberships/:id/validate')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Validate a pending membership (admin)' })
  @ApiResponse({ status: 200, description: 'Membership validated' })
  async validate(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.membershipsService.validate(id, user.userId);
  }

  @Patch('memberships/:id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Reject a pending membership (admin)' })
  @ApiResponse({ status: 200, description: 'Membership rejected' })
  async reject(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.membershipsService.reject(id, user.userId);
  }

  @Patch('memberships/:id/renew')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Renew my membership' })
  @ApiResponse({ status: 200, description: 'Renewal request created' })
  async renew(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.membershipsService.renew(id, user.userId);
  }
}
