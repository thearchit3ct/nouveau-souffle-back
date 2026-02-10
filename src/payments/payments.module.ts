import { Module, forwardRef } from '@nestjs/common';
import { StripeService } from './stripe.service.js';
import { StripeWebhookController } from './stripe-webhook.controller.js';
import { DonationsModule } from '../donations/donations.module.js';
import { ReceiptsModule } from '../receipts/receipts.module.js';

@Module({
  imports: [forwardRef(() => DonationsModule), ReceiptsModule],
  controllers: [StripeWebhookController],
  providers: [StripeService],
  exports: [StripeService],
})
export class PaymentsModule {}
