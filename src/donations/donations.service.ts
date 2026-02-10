import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { StripeService } from '../payments/stripe.service.js';
import { CreateDonationDto } from './dto/create-donation.dto.js';
import { CreateDonationIntentDto } from '../payments/dto/create-donation-intent.dto.js';

@Injectable()
export class DonationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly stripe: StripeService,
  ) {}

  async create(userId: string, dto: CreateDonationDto) {
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });
      if (!project || project.status !== 'ACTIVE') {
        throw new BadRequestException('Projet invalide ou inactif');
      }
    }

    const donation = await this.prisma.donation.create({
      data: {
        userId,
        amount: dto.amount,
        type: dto.type,
        status: 'PENDING',
        projectId: dto.projectId ?? null,
        isAnonymous: dto.isAnonymous ?? false,
        receiptRequested: dto.receiptRequested ?? true,
      },
    });

    return { data: donation };
  }

  async findMyDonations(userId: string, page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const where = { userId };

    const [data, totalCount] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        include: { project: { select: { id: true, name: true, slug: true } } },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.donation.count({ where }),
    ]);

    return {
      data,
      meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async findAll(page = 1, limit = 25, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [data, totalCount] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true, slug: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.donation.count({ where }),
    ]);

    return {
      data,
      meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!donation) throw new NotFoundException('Don non trouve');

    // Owner or admin can see
    if (userId && donation.userId !== userId && userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Acces refuse');
    }

    return { data: donation };
  }

  async validate(id: string, adminId: string) {
    const donation = await this.prisma.donation.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!donation) throw new NotFoundException('Don non trouve');
    if (donation.status !== 'PENDING') {
      throw new BadRequestException('Seul un don en attente peut etre valide');
    }

    const now = new Date();

    const updated = await this.prisma.donation.update({
      where: { id },
      data: { status: 'COMPLETED', paidAt: now },
    });

    // Update project collected amount
    if (donation.projectId) {
      await this.prisma.project.update({
        where: { id: donation.projectId },
        data: { collectedAmount: { increment: donation.amount } },
      });
    }

    // Upgrade user role if ANONYMOUS
    if (donation.user && donation.user.role === 'ANONYMOUS') {
      await this.prisma.user.update({
        where: { id: donation.userId! },
        data: { role: 'DONOR' },
      });
    }

    if (donation.userId) {
      await this.notifications.create(
        donation.userId,
        'DONATION_VALIDATED',
        'Don confirme',
        `Votre don de ${donation.amount} EUR a ete confirme. Merci !`,
        { donationId: id },
        '/espace-membre/dons',
      );
    }

    await this.audit.log(adminId, 'DONATION_VALIDATE', 'Donation', id, { status: 'PENDING' }, { status: 'COMPLETED' });

    return { data: updated };
  }

  async reject(id: string, adminId: string) {
    const donation = await this.prisma.donation.findUnique({ where: { id } });
    if (!donation) throw new NotFoundException('Don non trouve');
    if (donation.status !== 'PENDING') {
      throw new BadRequestException('Seul un don en attente peut etre annule');
    }

    const updated = await this.prisma.donation.update({
      where: { id },
      data: { status: 'CANCELED' },
    });

    if (donation.userId) {
      await this.notifications.create(
        donation.userId,
        'DONATION_REJECTED',
        'Don annule',
        'Votre don a ete annule.',
        { donationId: id },
      );
    }

    await this.audit.log(adminId, 'DONATION_REJECT', 'Donation', id, { status: 'PENDING' }, { status: 'CANCELED' });

    return { data: updated };
  }

  async getStats() {
    const [totalAmount, totalCount, byMonth] = await Promise.all([
      this.prisma.donation.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { amount: true },
      }),
      this.prisma.donation.count({ where: { status: 'COMPLETED' } }),
      this.prisma.$queryRawUnsafe<Array<{ month: string; total: string; count: string }>>(
        `SELECT to_char(paid_at, 'YYYY-MM') as month, SUM(amount)::text as total, COUNT(*)::text as count
         FROM donations WHERE status = 'COMPLETED' AND paid_at IS NOT NULL
         GROUP BY to_char(paid_at, 'YYYY-MM') ORDER BY month DESC LIMIT 12`,
      ),
    ]);

    return {
      data: {
        totalAmount: totalAmount._sum.amount ?? 0,
        totalCount,
        byMonth,
      },
    };
  }

  async createPaymentIntent(dto: CreateDonationIntentDto) {
    // Validate project if provided
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });
      if (!project || project.status !== 'ACTIVE') {
        throw new BadRequestException('Projet invalide ou inactif');
      }
    }

    // Create Stripe PaymentIntent (amount in cents)
    const { id: paymentIntentId, client_secret: clientSecret } =
      await this.stripe.createPaymentIntent(
        Math.round(dto.amount * 100),
        'eur',
        {
          donorEmail: dto.donorEmail,
          donorFirstName: dto.donorFirstName,
          donorLastName: dto.donorLastName,
          projectId: dto.projectId ?? '',
          isAnonymous: String(dto.isAnonymous ?? false),
        },
        dto.donorEmail,
      );

    // Create donation record in DB
    const donation = await this.prisma.donation.create({
      data: {
        amount: dto.amount,
        type: 'ONE_TIME',
        status: 'PENDING',
        stripePaymentIntentId: paymentIntentId,
        projectId: dto.projectId ?? null,
        isAnonymous: dto.isAnonymous ?? false,
        receiptRequested: dto.receiptRequested ?? true,
        paymentMethod: 'CARD',
        metadata: {
          donorEmail: dto.donorEmail,
          donorFirstName: dto.donorFirstName,
          donorLastName: dto.donorLastName,
          donorAddress: dto.donorAddress ?? '',
          donorPostalCode: dto.donorPostalCode ?? '',
          donorCity: dto.donorCity ?? '',
        },
      },
    });

    return {
      data: {
        donationId: donation.id,
        clientSecret,
        amount: dto.amount,
        currency: 'eur',
      },
    };
  }
}
