import { Module } from '@nestjs/common';
import { MaraudeCategoriesService } from './maraude-categories.service.js';
import { MaraudeCategoriesController } from './maraude-categories.controller.js';

@Module({
  controllers: [MaraudeCategoriesController],
  providers: [MaraudeCategoriesService],
  exports: [MaraudeCategoriesService],
})
export class MaraudeCategoriesModule {}
