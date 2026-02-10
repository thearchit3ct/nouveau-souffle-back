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
import { ReferralStructuresService } from './referral-structures.service.js';
import { CreateReferralStructureDto, UpdateReferralStructureDto } from './dto/create-referral-structure.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('referral-structures')
@Controller('api/v1/referral-structures')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class ReferralStructuresController {
  constructor(private readonly structuresService: ReferralStructuresService) {}

  @Get()
  @ApiOperation({ summary: 'Annuaire des structures partenaires' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.structuresService.findAll(
      Math.max(1, parseInt(page || '1', 10)),
      Math.min(100, Math.max(1, parseInt(limit || '25', 10))),
      type,
      search,
    );
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Structures par proximite GPS' })
  @ApiQuery({ name: 'lat', required: true, type: Number })
  @ApiQuery({ name: 'lng', required: true, type: Number })
  @ApiQuery({ name: 'radiusKm', required: false, type: Number })
  async findNearby(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radiusKm') radiusKm?: string,
  ) {
    return this.structuresService.findNearby(
      parseFloat(lat),
      parseFloat(lng),
      radiusKm ? parseFloat(radiusKm) : undefined,
    );
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Ajouter une structure partenaire' })
  @ApiResponse({ status: 201 })
  async create(@Body() dto: CreateReferralStructureDto) {
    return this.structuresService.create(dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Modifier une structure' })
  async update(@Param('id') id: string, @Body() dto: UpdateReferralStructureDto) {
    return this.structuresService.update(id, dto);
  }
}
