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
import { MaraudesService } from './maraudes.service.js';
import { CreateMaraudeDto } from './dto/create-maraude.dto.js';
import { UpdateMaraudeDto } from './dto/update-maraude.dto.js';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto.js';
import { CreateReportDto } from './dto/create-report.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('maraudes')
@Controller('api/v1')
export class MaraudesController {
  constructor(private readonly maraudesService: MaraudesService) {}

  // ========== MARAUDE SESSIONS ==========

  @Post('maraudes')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Planifier une maraude' })
  @ApiResponse({ status: 201, description: 'Maraude creee' })
  async create(@Body() dto: CreateMaraudeDto, @CurrentUser() user: CurrentUserPayload) {
    return this.maraudesService.create(dto, user.userId);
  }

  @Get('maraudes')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les maraudes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'zoneId', required: false, type: String })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('zoneId') zoneId?: string,
  ) {
    return this.maraudesService.findAll(
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(100, Math.max(1, parseInt(limit || '25', 10))),
      status,
      zoneId,
    );
  }

  @Get('maraudes/upcoming')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Prochaines maraudes' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findUpcoming(@Query('limit') limit?: string) {
    return this.maraudesService.findUpcoming(parseInt(limit || '10', 10));
  }

  @Get('maraudes/:id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detail d\'une maraude' })
  @ApiResponse({ status: 200 }) @ApiResponse({ status: 404 })
  async findOne(@Param('id') id: string) {
    return this.maraudesService.findOne(id);
  }

  @Patch('maraudes/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une maraude' })
  async update(@Param('id') id: string, @Body() dto: UpdateMaraudeDto, @CurrentUser() user: CurrentUserPayload) {
    return this.maraudesService.update(id, dto, user.userId);
  }

  @Patch('maraudes/:id/start')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Demarrer une maraude' })
  async start(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.maraudesService.start(id, user.userId);
  }

  @Patch('maraudes/:id/end')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminer une maraude' })
  async end(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.maraudesService.end(id, user.userId);
  }

  @Post('maraudes/:id/join')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rejoindre l\'equipe d\'une maraude' })
  async join(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.maraudesService.join(id, user.userId);
  }

  @Delete('maraudes/:id/leave')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Quitter l\'equipe d\'une maraude' })
  async leave(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.maraudesService.leave(id, user.userId);
  }

  @Get('maraudes/:id/encounters')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Rencontres d\'une maraude' })
  async getEncounters(@Param('id') id: string) {
    return this.maraudesService.getEncounters(id);
  }

  // ========== REPORT ==========

  @Post('maraudes/:id/report')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Creer/maj le compte-rendu d\'une maraude' })
  async createReport(
    @Param('id') id: string,
    @Body() dto: CreateReportDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.maraudesService.createReport(id, dto, user.userId);
  }

  // ========== ZONES ==========

  @Get('maraude-zones')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister les zones de maraude' })
  async findAllZones() {
    return this.maraudesService.findAllZones();
  }

  @Post('maraude-zones')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Creer une zone de maraude' })
  async createZone(@Body() dto: CreateZoneDto) {
    return this.maraudesService.createZone(dto);
  }

  @Patch('maraude-zones/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier une zone' })
  async updateZone(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.maraudesService.updateZone(id, dto);
  }

  @Delete('maraude-zones/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Supprimer une zone' })
  async deleteZone(@Param('id') id: string) {
    return this.maraudesService.deleteZone(id);
  }
}
