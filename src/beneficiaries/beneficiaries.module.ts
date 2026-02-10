import { Module } from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service.js';
import { BeneficiariesController } from './beneficiaries.controller.js';

@Module({
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService],
  exports: [BeneficiariesService],
})
export class BeneficiariesModule {}
