import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { StripeService } from './stripe.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { DonationsService } from '../donations/donations.service.js';
import { ReceiptsService } from '../receipts/receipts.service.js';
import { EmailService } from '../email/email.service.js';

@ApiTags('webhooks')
@Controller('api/v1/webhooks')
export class StripeWebhookController {
  private readonly logger = new Logger(StripeWebhookController.name);

  constructor(
    private readonly stripe: StripeService,
    private readonly prisma: PrismaService,
    private readonly donationsService: DonationsService,
    private readonly receiptsService: ReceiptsService,
    private readonly emailService: EmailService,
  ) {}

  @Post('stripe')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Stripe webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    let event;
    try {
      event = this.stripe.constructWebhookEvent(req.rawBody, signature);
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Idempotence check
    const existing = await (this.prisma as any).stripeWebhookLog.findUnique({
      where: { eventId: event.id },
    });
    if (existing) {
      this.logger.log(`Duplicate webhook event ${event.id}, skipping`);
      return { received: true };
    }

    // Log the event
    await (this.prisma as any).stripeWebhookLog.create({
      data: {
        eventId: event.id,
        type: event.type,
        data: event.data as any,
      },
    });

    // Process event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await this.handlePaymentSucceeded(event.data.object as any);
        break;
      case 'payment_intent.payment_failed':
        await this.handlePaymentFailed(event.data.object as any);
        break;
      case 'charge.refunded':
        await this.handleChargeRefunded(event.data.object as any);
        break;
      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }

    return { received: true };
  }

  private async handlePaymentSucceeded(paymentIntent: any) {
    const donation = await this.prisma.donation.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
      include: { user: true, project: true },
    });
    if (!donation) {
      this.logger.warn(`No donation found for PaymentIntent ${paymentIntent.id}`);
      return;
    }
    if (donation.status !== 'PENDING') {
      this.logger.log(`Donation ${donation.id} already ${donation.status}, skipping`);
      return;
    }

    const chargeId = paymentIntent.latest_charge ?? null;

    // Update donation to COMPLETED
    await this.prisma.donation.update({
      where: { id: donation.id },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        stripeChargeId: typeof chargeId === 'string' ? chargeId : null,
      },
    });

    // Update project collected amount
    if (donation.projectId) {
      await this.prisma.project.update({
        where: { id: donation.projectId },
        data: { collectedAmount: { increment: donation.amount } },
      });
    }

    // Upgrade user role if ANONYMOUS
    if (donation.user && donation.user.role === 'ANONYMOUS') {
      await this.prisma.user.update({
        where: { id: donation.userId! },
        data: { role: 'DONOR' },
      });
    }

    // Generate receipt if requested
    if (donation.receiptRequested) {
      try {
        await this.receiptsService.generateReceipt(donation.id);
      } catch (err) {
        this.logger.error(`Failed to generate receipt for donation ${donation.id}: ${err}`);
      }
    }

    // Send confirmation email
    const metadata = (donation.metadata ?? {}) as Record<string, string>;
    const donorEmail = donation.user?.email ?? metadata.donorEmail;
    const donorName = donation.user
      ? `${donation.user.firstName} ${donation.user.lastName}`
      : `${metadata.donorFirstName ?? ''} ${metadata.donorLastName ?? ''}`.trim();

    if (donorEmail) {
      const receipt = await this.prisma.donationReceipt.findFirst({
        where: { donationId: donation.id, status: 'GENERATED' },
      });
      await this.emailService.sendDonationConfirmation(
        donorEmail,
        donorName || 'Donateur',
        Number(donation.amount),
        receipt?.receiptNumber,
      );
    }

    this.logger.log(`Donation ${donation.id} completed via Stripe`);
  }

  private async handlePaymentFailed(paymentIntent: any) {
    const donation = await this.prisma.donation.findFirst({
      where: { stripePaymentIntentId: paymentIntent.id },
    });
    if (!donation || donation.status !== 'PENDING') return;

    await this.prisma.donation.update({
      where: { id: donation.id },
      data: { status: 'FAILED' },
    });

    this.logger.log(`Donation ${donation.id} failed`);
  }

  private async handleChargeRefunded(charge: any) {
    const donation = await this.prisma.donation.findFirst({
      where: { stripeChargeId: charge.id },
    });
    if (!donation) return;

    await this.prisma.donation.update({
      where: { id: donation.id },
      data: { status: 'REFUNDED' },
    });

    // Cancel receipt if exists
    await this.prisma.donationReceipt.updateMany({
      where: { donationId: donation.id },
      data: { status: 'CANCELED' },
    });

    this.logger.log(`Donation ${donation.id} refunded`);
  }
}
