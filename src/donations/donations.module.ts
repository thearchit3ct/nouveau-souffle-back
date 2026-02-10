import { Module, forwardRef } from '@nestjs/common';
import { DonationsService } from './donations.service.js';
import { DonationsController } from './donations.controller.js';
import { PaymentsModule } from '../payments/payments.module.js';

@Module({
  imports: [forwardRef(() => PaymentsModule)],
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
