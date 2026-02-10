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
      case 'customer.subscription.created':
        await this.handleSubscriptionCreated(event.data.object as any);
        break;
      case 'invoice.payment_succeeded':
        await this.handleInvoicePaymentSucceeded(event.data.object as any);
        break;
      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(event.data.object as any);
        break;
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(event.data.object as any);
        break;
      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(event.data.object as any);
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

  private async handleSubscriptionCreated(subscription: any) {
    const recurrence = await this.prisma.donationRecurrence.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!recurrence) {
      this.logger.warn(`No recurrence found for subscription ${subscription.id}`);
      return;
    }

    if (recurrence.status !== 'ACTIVE') {
      await this.prisma.donationRecurrence.update({
        where: { id: recurrence.id },
        data: { status: 'ACTIVE' },
      });
    }

    this.logger.log(`Subscription ${subscription.id} created, recurrence ${recurrence.id} active`);
  }

  private async handleInvoicePaymentSucceeded(invoice: any) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    const recurrence = await this.prisma.donationRecurrence.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      include: { user: true, project: true },
    });
    if (!recurrence) {
      this.logger.warn(`No recurrence found for subscription ${subscriptionId} (invoice succeeded)`);
      return;
    }

    // Create a RECURRING donation record linked to this recurrence
    await this.prisma.donation.create({
      data: {
        userId: recurrence.userId,
        projectId: recurrence.projectId,
        recurrenceId: recurrence.id,
        amount: recurrence.amount,
        type: 'RECURRING',
        status: 'COMPLETED',
        paymentMethod: 'CARD',
        paidAt: new Date(),
        receiptRequested: true,
        metadata: {
          stripeInvoiceId: invoice.id,
          stripeSubscriptionId: subscriptionId,
        },
      },
    });

    // Increment payment count and update last payment date
    await this.prisma.donationRecurrence.update({
      where: { id: recurrence.id },
      data: {
        paymentCount: { increment: 1 },
        lastPaymentDate: new Date(),
      },
    });

    // Update project collected amount
    if (recurrence.projectId) {
      await this.prisma.project.update({
        where: { id: recurrence.projectId },
        data: { collectedAmount: { increment: recurrence.amount } },
      });
    }

    // Send confirmation email
    if (recurrence.user?.email) {
      const donorName = `${recurrence.user.firstName} ${recurrence.user.lastName}`;
      await this.emailService.sendDonationConfirmation(
        recurrence.user.email,
        donorName,
        Number(recurrence.amount),
      );
    }

    this.logger.log(
      `Invoice payment succeeded for recurrence ${recurrence.id}, payment #${recurrence.paymentCount + 1}`,
    );
  }

  private async handleInvoicePaymentFailed(invoice: any) {
    const subscriptionId = invoice.subscription;
    if (!subscriptionId) return;

    const recurrence = await this.prisma.donationRecurrence.findFirst({
      where: { stripeSubscriptionId: subscriptionId },
      include: { user: true },
    });
    if (!recurrence) {
      this.logger.warn(`No recurrence found for subscription ${subscriptionId} (invoice failed)`);
      return;
    }

    // Notify user of failed payment
    if (recurrence.user?.email) {
      const donorName = `${recurrence.user.firstName} ${recurrence.user.lastName}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #dc2626;">Echec de paiement</h2>
          <p>Bonjour ${donorName},</p>
          <p>Le paiement de <strong>${Number(recurrence.amount).toFixed(2)} &euro;</strong>
          pour votre don recurrent n'a pas pu etre traite.</p>
          <p>Veuillez verifier votre moyen de paiement dans votre espace donateur.</p>
          <p>Cordialement,<br />L'equipe Nouveau Souffle en Mission</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            Nouveau Souffle en Mission - Association loi 1901
          </p>
        </div>
      `;
      await this.emailService.sendTransactional(
        recurrence.user.email,
        'Echec de paiement - Don recurrent',
        html,
      );
    }

    this.logger.log(`Invoice payment failed for recurrence ${recurrence.id}`);
  }

  private async handleSubscriptionUpdated(subscription: any) {
    const recurrence = await this.prisma.donationRecurrence.findFirst({
      where: { stripeSubscriptionId: subscription.id },
    });
    if (!recurrence) {
      this.logger.warn(`No recurrence found for subscription ${subscription.id} (updated)`);
      return;
    }

    // Map Stripe subscription status to RecurrenceStatus
    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      past_due: 'ACTIVE',
      canceled: 'CANCELED',
      paused: 'PAUSED',
      unpaid: 'ACTIVE',
      incomplete: 'ACTIVE',
      incomplete_expired: 'EXPIRED',
      trialing: 'ACTIVE',
    };

    const newStatus = statusMap[subscription.status] ?? recurrence.status;
    const updateData: any = { status: newStatus };

    if (newStatus === 'CANCELED' && !recurrence.canceledAt) {
      updateData.canceledAt = new Date();
    }

    await this.prisma.donationRecurrence.update({
      where: { id: recurrence.id },
      data: updateData,
    });

    this.logger.log(
      `Subscription ${subscription.id} updated to ${subscription.status}, recurrence ${recurrence.id} -> ${newStatus}`,
    );
  }

  private async handleSubscriptionDeleted(subscription: any) {
    const recurrence = await this.prisma.donationRecurrence.findFirst({
      where: { stripeSubscriptionId: subscription.id },
      include: { user: true },
    });
    if (!recurrence) {
      this.logger.warn(`No recurrence found for subscription ${subscription.id} (deleted)`);
      return;
    }

    await this.prisma.donationRecurrence.update({
      where: { id: recurrence.id },
      data: {
        status: 'CANCELED',
        canceledAt: recurrence.canceledAt ?? new Date(),
      },
    });

    // Notify user of cancellation
    if (recurrence.user?.email) {
      const donorName = `${recurrence.user.firstName} ${recurrence.user.lastName}`;
      const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">Don recurrent annule</h2>
          <p>Bonjour ${donorName},</p>
          <p>Votre don recurrent de <strong>${Number(recurrence.amount).toFixed(2)} &euro;</strong>
          a bien ete annule.</p>
          <p>Nous vous remercions pour votre generosite. Vous pouvez a tout moment
          mettre en place un nouveau don recurrent depuis votre espace donateur.</p>
          <p>Cordialement,<br />L'equipe Nouveau Souffle en Mission</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #6b7280; font-size: 12px;">
            Nouveau Souffle en Mission - Association loi 1901
          </p>
        </div>
      `;
      await this.emailService.sendTransactional(
        recurrence.user.email,
        'Confirmation d\'annulation - Don recurrent',
        html,
      );
    }

    this.logger.log(`Subscription ${subscription.id} deleted, recurrence ${recurrence.id} canceled`);
  }
}
