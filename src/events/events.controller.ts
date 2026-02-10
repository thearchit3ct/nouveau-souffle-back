import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { verifySession } from 'supertokens-node/recipe/session/framework/express';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('events')
@Controller('api/v1/events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Get()
  @ApiOperation({ summary: 'List events (public)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, type: String })
  @ApiQuery({ name: 'visibility', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Paginated events' })
  async findAll(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('visibility') visibility?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.eventsService.findAll(pageNum, limitNum, status, type, visibility);
  }

  @Get('registrations/by-token/:token')
  @ApiOperation({ summary: 'Get registration by confirmation token (for QR check-in)' })
  @ApiResponse({ status: 200, description: 'Registration details' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async findRegistrationByToken(@Param('token') token: string) {
    return this.eventsService.findRegistrationByToken(token);
  }

  @Patch('registrations/by-token/:token/check-in')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('COORDINATOR', 'ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check-in by token (QR code scan)' })
  @ApiResponse({ status: 200, description: 'Checked in successfully' })
  @ApiResponse({ status: 400, description: 'Not confirmed or already checked in' })
  @ApiResponse({ status: 404, description: 'Registration not found' })
  async checkInByToken(@Param('token') token: string) {
    return this.eventsService.checkInByToken(token);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get event by ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  async findOne(
    @Param('id') id: string,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    // Try to parse optional session for visibility check
    try {
      await new Promise<void>((resolve, reject) => {
        verifySession({ sessionRequired: false })(req as any, res as any, (err?: any) => {
          if (err) reject(err);
          else resolve();
        });
      });
    } catch { /* no session, that's fine */ }
    const session = (req as any).session;
    const role = session?.getAccessTokenPayload?.()?.role;
    return this.eventsService.findOne(id, role);
  }

  @Post()
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create event (admin)' })
  @ApiResponse({ status: 201, description: 'Event created' })
  async create(
    @Body() dto: CreateEventDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.create(dto, user.userId);
  }

  @Patch(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update event (admin)' })
  @ApiResponse({ status: 200, description: 'Event updated' })
  async update(@Param('id') id: string, @Body() dto: UpdateEventDto) {
    return this.eventsService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel event (admin)' })
  @ApiResponse({ status: 200, description: 'Event canceled' })
  async cancel(@Param('id') id: string) {
    return this.eventsService.cancel(id);
  }

  @Post(':id/register')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register for event' })
  @ApiResponse({ status: 201, description: 'Registration created' })
  async register(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.register(id, user.userId);
  }

  @Delete(':id/register')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel registration' })
  @ApiResponse({ status: 200, description: 'Registration canceled' })
  async cancelRegistration(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.eventsService.cancelRegistration(id, user.userId);
  }

  @Get(':id/registrations')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List event registrations (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Paginated registrations' })
  async getRegistrations(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit || '25', 10)));
    return this.eventsService.getRegistrations(id, pageNum, limitNum);
  }

  @Patch(':id/registrations/:regId/check-in')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Check-in registration (admin)' })
  @ApiResponse({ status: 200, description: 'Checked in' })
  async checkIn(@Param('regId') regId: string) {
    return this.eventsService.checkIn(regId);
  }
}
