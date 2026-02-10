import {
  Controller,
  Get,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { AuthGuard } from './auth.guard.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { Request } from 'express';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'Current user data' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  async getMe(@Req() req: Request) {
    const session = (req as any).session;
    const payload = session.getAccessTokenPayload();
    const userId = payload?.userId;

    if (!userId) {
      return {
        data: null,
        error: { code: 'USER_NOT_FOUND', message: 'Utilisateur non trouve' },
      };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        civility: true,
        avatarUrl: true,
        emailVerified: true,
        status: true,
        role: true,
        preferences: true,
        addressLine1: true,
        addressLine2: true,
        postalCode: true,
        city: true,
        country: true,
        createdAt: true,
      },
    });

    return { data: user };
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout current session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(@Req() req: Request) {
    const session = (req as any).session;
    await session.revokeSession();
    return { data: { message: 'Deconnexion reussie' } };
  }
}
