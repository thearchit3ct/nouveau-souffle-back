import { Module } from '@nestjs/common';
import { MaraudesService } from './maraudes.service.js';
import { MaraudesController } from './maraudes.controller.js';

@Module({
  controllers: [MaraudesController],
  providers: [MaraudesService],
  exports: [MaraudesService],
})
export class MaraudesModule {}
