import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { EmailService } from './email.service.js';

@Injectable()
export class EmailCronService {
  private readonly logger = new Logger(EmailCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  // Every day at 9:00 AM - membership renewal reminders (7 days before expiry)
  @Cron('0 9 * * *')
  async sendMembershipRenewalReminders() {
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const startOfDay = new Date(sevenDaysFromNow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(sevenDaysFromNow);
    endOfDay.setHours(23, 59, 59, 999);

    const expiringMemberships = await this.prisma.membership.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { gte: startOfDay, lte: endOfDay },
      },
      include: { user: true },
    });

    for (const m of expiringMemberships) {
      if (m.user.email) {
        await this.emailService.sendMembershipRenewalReminder(
          m.user.email,
          `${m.user.firstName} ${m.user.lastName}`,
          m.endDate.toLocaleDateString('fr-FR'),
        );
      }
    }

    if (expiringMemberships.length > 0) {
      this.logger.log(`Sent ${expiringMemberships.length} membership renewal reminders`);
    }
  }

  // Every day at 9:00 AM - event reminders (24h before)
  @Cron('0 9 * * *')
  async sendEventReminders() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startOfDay = new Date(tomorrow);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(tomorrow);
    endOfDay.setHours(23, 59, 59, 999);

    const upcomingEvents = await this.prisma.event.findMany({
      where: {
        status: { in: ['PUBLISHED', 'ONGOING'] },
        startDatetime: { gte: startOfDay, lte: endOfDay },
      },
    });

    for (const event of upcomingEvents) {
      const registrations = await this.prisma.eventRegistration.findMany({
        where: { eventId: event.id, status: 'CONFIRMED' },
        include: { user: true },
      });

      for (const reg of registrations) {
        if (reg.user?.email) {
          await this.emailService.sendEventReminder(
            reg.user.email,
            `${reg.user.firstName} ${reg.user.lastName}`,
            event.title,
            event.startDatetime.toLocaleDateString('fr-FR'),
          );
        }
      }
    }

    if (upcomingEvents.length > 0) {
      this.logger.log(`Sent event reminders for ${upcomingEvents.length} events`);
    }
  }
}
