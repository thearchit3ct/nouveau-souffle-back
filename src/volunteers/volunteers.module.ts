import { Module } from '@nestjs/common';
import { VolunteersService } from './volunteers.service.js';
import { VolunteersController } from './volunteers.controller.js';

@Module({
  controllers: [VolunteersController],
  providers: [VolunteersService],
  exports: [VolunteersService],
})
export class VolunteersModule {}
