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
import { BeneficiariesService } from './beneficiaries.service.js';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto.js';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('beneficiaries')
@Controller('api/v1/beneficiaries')
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  @Post()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Creer une fiche beneficiaire' })
  @ApiResponse({ status: 201, description: 'Fiche creee' })
  async create(@Body() dto: CreateBeneficiaryDto, @CurrentUser() user: CurrentUserPayload) {
    return this.beneficiariesService.create(dto, user.userId);
  }

  @Get()
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lister/rechercher les beneficiaires' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'housingStatus', required: false, type: String })
  @ApiQuery({ name: 'tags', required: false, type: String, description: 'Comma-separated tags' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('housingStatus') housingStatus?: string,
    @Query('tags') tags?: string,
  ) {
    return this.beneficiariesService.findAll(
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(100, Math.max(1, parseInt(limit || '25', 10))),
      search,
      housingStatus,
      tags,
    );
  }

  @Get('nearby')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Beneficiaires par proximite GPS' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  async findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.beneficiariesService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      radiusKm ? parseFloat(radiusKm) : undefined,
    );
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Detail d\'un beneficiaire' })
  @ApiResponse({ status: 200 }) @ApiResponse({ status: 404 })
  async findOne(@Param('id') id: string) {
    return this.beneficiariesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Modifier un beneficiaire' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateBeneficiaryDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.beneficiariesService.update(id, dto, user.userId);
  }

  @Get(':id/history')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Historique des rencontres d\'un beneficiaire' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async getHistory(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.beneficiariesService.getHistory(
      id,
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(100, Math.max(1, parseInt(limit || '25', 10))),
    );
  }

  // ========== RGPD ==========

  @Post(':id/anonymize')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Anonymiser un beneficiaire (RGPD droit a l\'oubli)' })
  async anonymize(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.beneficiariesService.anonymize(id, user.userId);
  }

  @Get(':id/export')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Exporter le dossier d\'un beneficiaire (RGPD portabilite)' })
  async exportData(@Param('id') id: string) {
    return this.beneficiariesService.exportData(id);
  }
}
