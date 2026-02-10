import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service.js';
import { DonationsController } from './donations.controller.js';

@Module({
  controllers: [DonationsController],
  providers: [DonationsService],
  exports: [DonationsService],
})
export class DonationsModule {}
