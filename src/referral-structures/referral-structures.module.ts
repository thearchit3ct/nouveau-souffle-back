import { Module } from '@nestjs/common';
import { ReferralStructuresService } from './referral-structures.service.js';
import { ReferralStructuresController } from './referral-structures.controller.js';

@Module({
  controllers: [ReferralStructuresController],
  providers: [ReferralStructuresService],
  exports: [ReferralStructuresService],
})
export class ReferralStructuresModule {}
