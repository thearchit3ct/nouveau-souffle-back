import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { StripeService } from '../payments/stripe.service.js';
import { CreateRecurrenceDto } from './dto/create-recurrence.dto.js';

const FREQUENCY_TO_INTERVAL: Record<string, 'month' | 'quarter' | 'year'> = {
  MONTHLY: 'month',
  QUARTERLY: 'quarter',
  YEARLY: 'year',
};

// Normalize any frequency to a monthly multiplier for revenue calculations
const FREQUENCY_TO_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  YEARLY: 12,
};

@Injectable()
export class RecurrencesService {
  private readonly logger = new Logger(RecurrencesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
  ) {}

  async create(userId: string, dto: CreateRecurrenceDto) {
    // Validate project if provided
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });
      if (!project || project.status !== 'ACTIVE') {
        throw new BadRequestException('Projet invalide ou inactif');
      }
    }

    // Get user for Stripe customer creation
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Utilisateur non trouve');

    // Find or create Stripe customer
    let stripeCustomerId: string;
    const existingRecurrence = await this.prisma.donationRecurrence.findFirst({
      where: { userId, stripeCustomerId: { not: null } },
    });

    if (existingRecurrence?.stripeCustomerId) {
      stripeCustomerId = existingRecurrence.stripeCustomerId;
    } else {
      const customer = await this.stripe.createCustomer(
        user.email,
        `${user.firstName} ${user.lastName}`,
        { userId },
      );
      stripeCustomerId = customer.id;
    }

    // Create Stripe price for this recurrence
    const interval = FREQUENCY_TO_INTERVAL[dto.frequency];
    const price = await this.stripe.createPrice(dto.amount, 'eur', interval);

    // Create Stripe subscription
    const subscription = await this.stripe.createSubscription(
      stripeCustomerId,
      price.id,
      {
        userId,
        projectId: dto.projectId ?? '',
        frequency: dto.frequency,
      },
    );

    // Calculate next payment date based on frequency
    const now = new Date();
    const nextPaymentDate = new Date(now);
    const months = FREQUENCY_TO_MONTHS[dto.frequency];
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + months);

    // Persist recurrence in DB (amount stored as decimal EUR, not cents)
    const recurrence = await this.prisma.donationRecurrence.create({
      data: {
        userId,
        projectId: dto.projectId ?? null,
        amount: dto.amount / 100, // Convert cents to EUR for DB storage
        frequency: dto.frequency as any,
        status: 'ACTIVE',
        stripeSubscriptionId: subscription.id,
        stripeCustomerId,
        nextPaymentDate,
      },
    });

    // Extract client secret for frontend payment confirmation
    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;
    const clientSecret = paymentIntent?.client_secret ?? null;

    this.logger.log(
      `Recurrence ${recurrence.id} created for user ${userId}, subscription ${subscription.id}`,
    );

    return {
      data: {
        ...recurrence,
        clientSecret,
      },
    };
  }

  async findMyRecurrences(userId: string) {
    const recurrences = await this.prisma.donationRecurrence.findMany({
      where: { userId },
      include: {
        project: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return { data: recurrences };
  }

  async findOne(id: string) {
    const recurrence = await this.prisma.donationRecurrence.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
    });
    if (!recurrence) throw new NotFoundException('Recurrence non trouvee');
    return { data: recurrence };
  }

  async pause(id: string, userId: string) {
    const recurrence = await this.prisma.donationRecurrence.findUnique({
      where: { id },
    });
    if (!recurrence) throw new NotFoundException('Recurrence non trouvee');
    if (recurrence.userId !== userId) throw new ForbiddenException('Acces refuse');
    if (recurrence.status !== 'ACTIVE') {
      throw new BadRequestException('Seule une recurrence active peut etre mise en pause');
    }

    if (recurrence.stripeSubscriptionId) {
      await this.stripe.pauseSubscription(recurrence.stripeSubscriptionId);
    }

    const updated = await this.prisma.donationRecurrence.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    this.logger.log(`Recurrence ${id} paused by user ${userId}`);
    return { data: updated };
  }

  async resume(id: string, userId: string) {
    const recurrence = await this.prisma.donationRecurrence.findUnique({
      where: { id },
    });
    if (!recurrence) throw new NotFoundException('Recurrence non trouvee');
    if (recurrence.userId !== userId) throw new ForbiddenException('Acces refuse');
    if (recurrence.status !== 'PAUSED') {
      throw new BadRequestException('Seule une recurrence en pause peut etre reprise');
    }

    if (recurrence.stripeSubscriptionId) {
      await this.stripe.resumeSubscription(recurrence.stripeSubscriptionId);
    }

    const updated = await this.prisma.donationRecurrence.update({
      where: { id },
      data: { status: 'ACTIVE' },
    });

    this.logger.log(`Recurrence ${id} resumed by user ${userId}`);
    return { data: updated };
  }

  async cancel(id: string, userId: string) {
    const recurrence = await this.prisma.donationRecurrence.findUnique({
      where: { id },
    });
    if (!recurrence) throw new NotFoundException('Recurrence non trouvee');
    if (recurrence.userId !== userId) throw new ForbiddenException('Acces refuse');
    if (recurrence.status === 'CANCELED') {
      throw new BadRequestException('Cette recurrence est deja annulee');
    }

    if (recurrence.stripeSubscriptionId) {
      await this.stripe.cancelSubscription(recurrence.stripeSubscriptionId);
    }

    const updated = await this.prisma.donationRecurrence.update({
      where: { id },
      data: {
        status: 'CANCELED',
        canceledAt: new Date(),
      },
    });

    this.logger.log(`Recurrence ${id} canceled by user ${userId}`);
    return { data: updated };
  }

  async findAll(page = 1, limit = 25) {
    const skip = (page - 1) * limit;

    const [data, totalCount] = await Promise.all([
      this.prisma.donationRecurrence.findMany({
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          project: { select: { id: true, name: true, slug: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.donationRecurrence.count(),
    ]);

    return {
      data,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getStats() {
    const [totalActive, activeRecurrences] = await Promise.all([
      this.prisma.donationRecurrence.count({ where: { status: 'ACTIVE' } }),
      this.prisma.donationRecurrence.findMany({
        where: { status: 'ACTIVE' },
        select: { amount: true, frequency: true },
      }),
    ]);

    // Calculate monthly-normalized revenue from all active recurrences
    let monthlyRevenue = 0;
    let totalAmount = 0;

    for (const rec of activeRecurrences) {
      const amount = Number(rec.amount);
      totalAmount += amount;
      const months = FREQUENCY_TO_MONTHS[rec.frequency] ?? 1;
      monthlyRevenue += amount / months;
    }

    const averageAmount = totalActive > 0 ? totalAmount / totalActive : 0;

    return {
      data: {
        totalActive,
        monthlyRevenue: Math.round(monthlyRevenue * 100) / 100,
        averageAmount: Math.round(averageAmount * 100) / 100,
      },
    };
  }
}
