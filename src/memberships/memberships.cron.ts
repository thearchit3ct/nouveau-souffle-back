import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class MembershipsCron {
  private readonly logger = new Logger(MembershipsCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('0 2 * * *') // Daily at 2:00 AM
  async handleExpiredMemberships() {
    const now = new Date();
    this.logger.log('Checking for expired memberships...');

    // ACTIVE → EXPIRED where endDate < today
    const expired = await this.prisma.membership.findMany({
      where: { status: 'ACTIVE', endDate: { lt: now } },
    });

    for (const m of expired) {
      await this.prisma.membership.update({
        where: { id: m.id },
        data: { status: 'EXPIRED' },
      });

      await this.notifications.create(
        m.userId,
        'MEMBERSHIP_EXPIRED',
        'Adhesion expiree',
        'Votre adhesion a expire. Pensez a la renouveler.',
        { membershipId: m.id },
        '/espace-membre/adhesion',
      );
    }

    if (expired.length > 0) {
      this.logger.log(`${expired.length} memberships expired`);
    }

    // Downgrade users with EXPIRED memberships older than 30 days
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const staleExpired = await this.prisma.membership.findMany({
      where: {
        status: 'EXPIRED',
        endDate: { lt: thirtyDaysAgo },
      },
      include: { user: { select: { id: true, role: true } } },
    });

    for (const m of staleExpired) {
      if (m.user.role === 'MEMBER') {
        await this.prisma.user.update({
          where: { id: m.userId },
          data: { role: 'DONOR' },
        });
        this.logger.log(`Downgraded user ${m.userId} from MEMBER to DONOR`);
      }
    }
  }
}
