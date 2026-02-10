import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { EncountersService } from './encounters.service.js';
import { CreateEncounterDto } from './dto/create-encounter.dto.js';
import { QuickEncounterDto } from './dto/quick-encounter.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('encounters')
@Controller('api/v1/encounters')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Post()
  @ApiOperation({ summary: 'Enregistrer une rencontre (complet)' })
  @ApiResponse({ status: 201, description: 'Rencontre creee' })
  async create(@Body() dto: CreateEncounterDto, @CurrentUser() user: CurrentUserPayload) {
    return this.encountersService.create(dto, user.userId);
  }

  @Post('quick')
  @ApiOperation({ summary: 'Rencontre rapide (Quick Log 30s)' })
  @ApiResponse({ status: 201 })
  async quickCreate(@Body() dto: QuickEncounterDto, @CurrentUser() user: CurrentUserPayload) {
    return this.encountersService.quickCreate(dto, user.userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail d\'une rencontre' })
  @ApiResponse({ status: 200 }) @ApiResponse({ status: 404 })
  async findOne(@Param('id') id: string) {
    return this.encountersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Modifier une rencontre' })
  async update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateEncounterDto>,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.encountersService.update(id, dto, user.userId);
  }

  @Post(':id/needs')
  @ApiOperation({ summary: 'Ajouter des besoins a une rencontre' })
  async addNeeds(@Param('id') id: string, @Body() body: { needCategoryIds: string[] }) {
    return this.encountersService.addNeeds(id, body.needCategoryIds);
  }

  @Post(':id/actions')
  @ApiOperation({ summary: 'Ajouter des actions a une rencontre' })
  async addActions(@Param('id') id: string, @Body() body: { actionCategoryIds: string[] }) {
    return this.encountersService.addActions(id, body.actionCategoryIds);
  }
}
