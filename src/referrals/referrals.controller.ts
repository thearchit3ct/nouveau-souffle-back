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
import { ReferralsService } from './referrals.service.js';
import { CreateReferralDto, UpdateReferralDto } from './dto/create-referral.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('referrals')
@Controller('api/v1/referrals')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ReferralsController {
  constructor(private readonly referralsService: ReferralsService) {}

  @Post()
  @ApiOperation({ summary: 'Creer une orientation' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateReferralDto, @CurrentUser() user: CurrentUserPayload) {
    return this.referralsService.create(dto, user.userId);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Lister les orientations' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'beneficiaryId', required: false, type: String })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('beneficiaryId') beneficiaryId?: string,
  ) {
    return this.referralsService.findAll(
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(100, Math.max(1, parseInt(limit || '25', 10))),
      status,
      beneficiaryId,
    );
  }

  @Get('pending')
  @UseGuards(RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Orientations en attente' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findPending(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.referralsService.findPending(
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(100, Math.max(1, parseInt(limit || '25', 10))),
    );
  }

  @Get('follow-up')
  @UseGuards(RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Orientations a suivre' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findFollowUp(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.referralsService.findFollowUp(
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(100, Math.max(1, parseInt(limit || '25', 10))),
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Modifier le statut d\'une orientation' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateReferralDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.referralsService.update(id, dto, user.userId);
  }
}
