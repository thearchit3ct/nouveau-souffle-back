import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly stripe: Stripe | null;
  private readonly webhookSecret: string;
  private readonly logger = new Logger(StripeService.name);

  constructor(private readonly config: ConfigService) {
    const secretKey = this.config.get<string>('STRIPE_SECRET_KEY', '');
    this.webhookSecret = this.config.get<string>('STRIPE_WEBHOOK_SECRET', '');

    if (secretKey) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2024-12-18.acacia' as Stripe.LatestApiVersion,
        maxNetworkRetries: 3,
      });
    } else {
      this.stripe = null;
      this.logger.warn('STRIPE_SECRET_KEY not configured — Stripe payments disabled');
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new Error('Stripe is not configured. Set STRIPE_SECRET_KEY env var.');
    }
    return this.stripe;
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

    const intent = await this.ensureStripe().paymentIntents.create(params);
    this.logger.log(`PaymentIntent created: ${intent.id} for ${amount} ${currency}`);

    return { id: intent.id, client_secret: intent.client_secret! };
  }

  constructWebhookEvent(rawBody: Buffer, signature: string): Stripe.Event {
    return this.ensureStripe().webhooks.constructEvent(
      rawBody,
      signature,
      this.webhookSecret,
    );
  }

  async retrievePaymentIntent(id: string): Promise<Stripe.PaymentIntent> {
    return this.ensureStripe().paymentIntents.retrieve(id);
  }

  async createCustomer(
    email: string,
    name: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Customer> {
    const customer = await this.ensureStripe().customers.create({
      email,
      name,
      metadata,
    });
    this.logger.log(`Stripe customer created: ${customer.id}`);
    return customer;
  }

  async createSubscription(
    customerId: string,
    priceId: string,
    metadata?: Record<string, string>,
  ): Promise<Stripe.Subscription> {
    const subscription = await this.ensureStripe().subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      metadata,
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
    });
    this.logger.log(`Subscription created: ${subscription.id}`);
    return subscription;
  }

  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const sub = await this.ensureStripe().subscriptions.cancel(subscriptionId);
    this.logger.log(`Subscription canceled: ${subscriptionId}`);
    return sub;
  }

  async pauseSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const sub = await this.ensureStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
    });
    this.logger.log(`Subscription paused (cancel at period end): ${subscriptionId}`);
    return sub;
  }

  async resumeSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const sub = await this.ensureStripe().subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
    this.logger.log(`Subscription resumed: ${subscriptionId}`);
    return sub;
  }

  async createPrice(
    amount: number,
    currency: string,
    interval: 'month' | 'quarter' | 'year',
  ): Promise<Stripe.Price> {
    // Stripe only supports month/year intervals, so quarterly = 3 months
    const stripeInterval = interval === 'quarter' ? 'month' : interval === 'year' ? 'year' : 'month';
    const intervalCount = interval === 'quarter' ? 3 : 1;

    const price = await this.ensureStripe().prices.create({
      unit_amount: amount,
      currency,
      recurring: { interval: stripeInterval, interval_count: intervalCount },
      product_data: { name: `Don recurrent ${(amount / 100).toFixed(2)} EUR` },
    });
    this.logger.log(`Price created: ${price.id}`);
    return price;
  }
}
