import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service.js';
import { MembershipsController } from './memberships.controller.js';
import { MembershipsCron } from './memberships.cron.js';

@Module({
  controllers: [MembershipsController],
  providers: [MembershipsService, MembershipsCron],
  exports: [MembershipsService],
})
export class MembershipsModule {}
