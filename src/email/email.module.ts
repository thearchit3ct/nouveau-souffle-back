import { Global, Module } from '@nestjs/common';
import { EmailService } from './email.service.js';
import { EmailCronService } from './email-cron.service.js';

@Global()
@Module({
  providers: [EmailService, EmailCronService],
  exports: [EmailService],
})
export class EmailModule {}
