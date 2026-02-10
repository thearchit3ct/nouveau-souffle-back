import { Module } from '@nestjs/common';
import { TrainingsService } from './trainings.service.js';
import { TrainingsController } from './trainings.controller.js';

@Module({
  controllers: [TrainingsController],
  providers: [TrainingsService],
  exports: [TrainingsService],
})
export class TrainingsModule {}
