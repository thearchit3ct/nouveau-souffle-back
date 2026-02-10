import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');

    this.stripe = new Stripe(secretKey, {
      apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
      maxNetworkRetries: 3,
    });
  }

  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: Record<string, string>,
    receiptEmail?: string,
  ) {
    const params: Stripe.PaymentIntentCreateParams = {
      amount,
      currency,
      metadata,
      automatic_payment_methods: { enabled: true },
    };
    if (receiptEmail) params.receipt_email = receiptEmail;

    const intent = await this.stripe.paymentIntents.create(params);
    this.logger.log(`PaymentIntent created: ${intent.id} for ${amount} ${currency}`);

    return { id: intent.id, client_secret: intent.client_secret! };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }

  async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.stripe.paymentIntents.retrieve(id);
  }
}
