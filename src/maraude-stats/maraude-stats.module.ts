import { Module } from '@nestjs/common';
import { MaraudeStatsService } from './maraude-stats.service.js';
import { MaraudeStatsController } from './maraude-stats.controller.js';

@Module({
  controllers: [MaraudeStatsController],
  providers: [MaraudeStatsService],
  exports: [MaraudeStatsService],
})
export class MaraudeStatsModule {}
