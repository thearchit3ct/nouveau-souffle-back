import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../email/email.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateContactDto } from './dto/create-contact.dto.js';

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly adminEmail: string;

  constructor(
    private readonly email: EmailService,
    private readonly audit: AuditService,
    private readonly config: ConfigService,
  ) {
    this.adminEmail = this.config.get<string>('ADMIN_EMAIL', 'contact@ns.thearchit3ct.xyz');
  }

  async submit(dto: CreateContactDto) {
    // Send notification to admin
    await this.email.sendContactNotification(
      this.adminEmail,
      dto.name,
      dto.email,
      dto.subject,
      dto.message,
    );

    // Send auto-reply to sender
    await this.email.sendContactAutoReply(dto.email, dto.name);

    // Audit log
    await this.audit.log(
      null,
      'CONTACT_FORM_SUBMIT',
      'Contact',
      undefined,
      undefined,
      { name: dto.name, email: dto.email, subject: dto.subject },
    );

    this.logger.log(`Contact form submitted by ${dto.name} (${dto.email})`);

    return { data: { message: 'Message envoye avec succes' } };
  }
}
