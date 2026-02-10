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
import { MaraudeCategoriesService } from './maraude-categories.service.js';
import { CreateNeedCategoryDto, CreateActionCategoryDto, UpdateCategoryDto } from './dto/create-category.dto.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';

@ApiTags('maraude-categories')
@Controller('api/v1')
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class MaraudeCategoriesController {
  constructor(private readonly categoriesService: MaraudeCategoriesService) {}

  // ========== NEED CATEGORIES ==========

  @Get('need-categories')
  @ApiOperation({ summary: 'Liste des categories de besoins' })
  async findAllNeeds() {
    return this.categoriesService.findAllNeeds();
  }

  @Post('need-categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Creer une categorie de besoin' })
  @ApiResponse({ status: 201 })
  async createNeed(@Body() dto: CreateNeedCategoryDto) {
    return this.categoriesService.createNeed(dto);
  }

  @Patch('need-categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Modifier une categorie de besoin' })
  async updateNeed(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.updateNeed(id, dto);
  }

  // ========== ACTION CATEGORIES ==========

  @Get('action-categories')
  @ApiOperation({ summary: 'Liste des categories d\'actions' })
  async findAllActions() {
    return this.categoriesService.findAllActions();
  }

  @Post('action-categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Creer une categorie d\'action' })
  @ApiResponse({ status: 201 })
  async createAction(@Body() dto: CreateActionCategoryDto) {
    return this.categoriesService.createAction(dto);
  }

  @Patch('action-categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiOperation({ summary: 'Modifier une categorie d\'action' })
  async updateAction(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.updateAction(id, dto);
  }
}
