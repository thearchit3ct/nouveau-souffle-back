import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateMembershipDto } from './dto/create-membership.dto.js';

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  async create(userId: string, dto: CreateMembershipDto) {
    // Check no existing ACTIVE membership
    const existing = await this.prisma.membership.findFirst({
      where: { userId, status: 'ACTIVE' },
    });
    if (existing) {
      throw new ConflictException('Vous avez deja une adhesion active');
    }

    // Validate membership type
    const membershipType = await this.prisma.membershipType.findUnique({
      where: { id: dto.membershipTypeId },
    });
    if (!membershipType || !membershipType.isActive) {
      throw new BadRequestException('Type d\'adhesion invalide ou inactif');
    }

    const now = new Date();
    const endDate = new Date(now);
    endDate.setMonth(endDate.getMonth() + membershipType.durationMonths);

    const membership = await this.prisma.membership.create({
      data: {
        userId,
        membershipTypeId: dto.membershipTypeId,
        secondaryUserId: dto.secondaryUserId ?? null,
        amountPaid: dto.amountPaid,
        status: 'PENDING',
        startDate: now,
        endDate,
      },
      include: { membershipType: true },
    });

    return { data: membership };
  }

  async findMyActive(userId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: { membershipType: true },
    });
    if (!membership) {
      throw new NotFoundException('Aucune adhesion active trouvee');
    }
    return { data: membership };
  }

  async findAll(page = 1, limit = 25, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;

    const [data, totalCount] = await Promise.all([
      this.prisma.membership.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
          membershipType: true,
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.membership.count({ where }),
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

  async findOne(id: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        membershipType: true,
        secondaryUser: { select: { id: true, email: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
      },
    });
    if (!membership) throw new NotFoundException('Adhesion non trouvee');
    return { data: membership };
  }

  async validate(id: string, adminId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!membership) throw new NotFoundException('Adhesion non trouvee');
    if (membership.status !== 'PENDING') {
      throw new BadRequestException('Seule une adhesion en attente peut etre validee');
    }

    const now = new Date();
    const memberNumber = await this.generateMemberNumber(now);

    const endDate = new Date(now);
    const membershipType = await this.prisma.membershipType.findUnique({
      where: { id: membership.membershipTypeId },
    });
    endDate.setMonth(endDate.getMonth() + (membershipType?.durationMonths ?? 12));

    const updated = await this.prisma.membership.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        memberNumber,
        startDate: now,
        endDate,
        approvedAt: now,
        approvedById: adminId,
      },
      include: { membershipType: true },
    });

    // Upgrade user role if currently DONOR or ANONYMOUS
    if (membership.user.role === 'DONOR' || membership.user.role === 'ANONYMOUS') {
      await this.prisma.user.update({
        where: { id: membership.userId },
        data: { role: 'MEMBER' },
      });
    }

    await this.notifications.create(
      membership.userId,
      'MEMBERSHIP_VALIDATED',
      'Adhesion validee',
      `Votre adhesion a ete validee. Numero de membre : ${memberNumber}`,
      { membershipId: id, memberNumber },
      '/espace-membre/adhesion',
    );

    await this.audit.log(adminId, 'MEMBERSHIP_VALIDATE', 'Membership', id, { status: 'PENDING' }, { status: 'ACTIVE', memberNumber });

    return { data: updated };
  }

  async reject(id: string, adminId: string) {
    const membership = await this.prisma.membership.findUnique({ where: { id } });
    if (!membership) throw new NotFoundException('Adhesion non trouvee');
    if (membership.status !== 'PENDING') {
      throw new BadRequestException('Seule une adhesion en attente peut etre rejetee');
    }

    const updated = await this.prisma.membership.update({
      where: { id },
      data: { status: 'REJECTED' },
      include: { membershipType: true },
    });

    await this.notifications.create(
      membership.userId,
      'MEMBERSHIP_REJECTED',
      'Adhesion refusee',
      'Votre demande d\'adhesion a ete refusee. Contactez-nous pour plus d\'informations.',
      { membershipId: id },
    );

    await this.audit.log(adminId, 'MEMBERSHIP_REJECT', 'Membership', id, { status: 'PENDING' }, { status: 'REJECTED' });

    return { data: updated };
  }

  async renew(id: string, userId: string) {
    const membership = await this.prisma.membership.findUnique({
      where: { id },
      include: { membershipType: true },
    });
    if (!membership) throw new NotFoundException('Adhesion non trouvee');
    if (membership.userId !== userId) {
      throw new BadRequestException('Vous ne pouvez renouveler que votre propre adhesion');
    }

    return this.create(userId, {
      membershipTypeId: membership.membershipTypeId,
      amountPaid: Number(membership.membershipType.price),
    });
  }

  async findActiveTypes() {
    const types = await this.prisma.membershipType.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    return { data: types };
  }

  private async generateMemberNumber(date: Date): Promise<string> {
    const year = date.getFullYear();
    const count = await this.prisma.membership.count({
      where: {
        memberNumber: { startsWith: `NSM-${year}` },
      },
    });
    const seq = String(count + 1).padStart(5, '0');
    return `NSM-${year}-${seq}`;
  }
}
