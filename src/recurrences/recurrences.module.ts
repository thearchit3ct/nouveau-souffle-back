import { Module } from '@nestjs/common';
import { RecurrencesService } from './recurrences.service.js';
import { RecurrencesController } from './recurrences.controller.js';
import { PaymentsModule } from '../payments/payments.module.js';

@Module({
  imports: [PaymentsModule],
  controllers: [RecurrencesController],
  providers: [RecurrencesService],
  exports: [RecurrencesService],
})
export class RecurrencesModule {}
