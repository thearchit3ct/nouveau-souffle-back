import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MaraudeStatsService } from './maraude-stats.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('maraude-stats')
@Controller('api/v1/maraude-stats')
@UseGuards(AuthGuard, RolesGuard)
@ApiBearerAuth()
export class MaraudeStatsController {
  constructor(private readonly statsService: MaraudeStatsService) {}

  @Get('dashboard')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Dashboard KPI maraudes' })
  async getDashboard() {
    return this.statsService.getDashboard();
  }

  @Get('activity')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Rapport d\'activite' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getActivity(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getActivity(startDate, endDate);
  }

  @Get('needs')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Analyse des besoins' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getNeeds(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.statsService.getNeeds(startDate, endDate);
  }

  @Get('territory')
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Donnees geographiques (heatmap)' })
  async getTerritory() {
    return this.statsService.getTerritory();
  }

  @Get('export')
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Export rapport (PDF/Excel/JSON)' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'format', required: false, type: String, description: 'json, csv' })
  async getExport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('format') format?: string,
  ) {
    return this.statsService.getExport(startDate, endDate, format);
  }
}
