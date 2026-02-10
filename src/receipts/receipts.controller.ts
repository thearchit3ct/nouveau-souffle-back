import {
  Controller,
  Get,
  Param,
  UseGuards,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReceiptsService } from './receipts.service.js';
import { UploadService } from '../upload/upload.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthGuard } from '../auth/auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { CurrentUserPayload } from '../auth/current-user.decorator.js';

@ApiTags('receipts')
@Controller('api/v1/donations')
@ApiBearerAuth()
export class ReceiptsController {
  constructor(
    private readonly receipts: ReceiptsService,
    private readonly upload: UploadService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('annual/:year')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Generate and download annual receipt' })
  @ApiResponse({ status: 200, description: 'Annual receipt URL' })
  async getAnnualReceipt(
    @Param('year') year: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const yearNum = parseInt(year, 10);
    // Try to get existing, if not found generate it
    try {
      return await this.receipts.getAnnualReceiptUrl(user.userId, yearNum);
    } catch {
      await this.receipts.generateAnnualReceipt(user.userId, yearNum);
      return this.receipts.getAnnualReceiptUrl(user.userId, yearNum);
    }
  }

  @Get('annual/:year/user/:userId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPER_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate annual receipt for specific user (admin)' })
  @ApiResponse({ status: 200, description: 'Annual receipt URL' })
  async getAnnualReceiptForUser(
    @Param('year') year: string,
    @Param('userId') userId: string,
  ) {
    const yearNum = parseInt(year, 10);
    try {
      return await this.receipts.getAnnualReceiptUrl(userId, yearNum);
    } catch {
      await this.receipts.generateAnnualReceipt(userId, yearNum);
      return this.receipts.getAnnualReceiptUrl(userId, yearNum);
    }
  }

  @Get(':id/receipt')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get donation receipt download URL' })
  @ApiResponse({ status: 200, description: 'Receipt URL and info' })
  async getReceipt(
    @Param('id') donationId: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    // Verify donation exists and check ownership
    const donation = await this.prisma.donation.findUnique({
      where: { id: donationId },
    });
    if (!donation) throw new NotFoundException('Don non trouve');

    if (
      donation.userId !== user.userId &&
      user.role !== 'ADMIN' &&
      user.role !== 'SUPER_ADMIN'
    ) {
      throw new ForbiddenException('Acces refuse');
    }

    const receipt = await this.receipts.findByDonation(donationId);
    if (!receipt) throw new NotFoundException('Recu non disponible');

    const { url } = await this.upload.getDownloadUrl(receipt.filePath, 600);

    return {
      data: {
        receiptUrl: url,
        receiptNumber: receipt.receiptNumber,
        filename: `${receipt.receiptNumber}.pdf`,
      },
    };
  }
}
