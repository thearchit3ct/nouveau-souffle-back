import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  private readonly defaultSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    civility: true,
    birthDate: true,
    avatarUrl: true,
    emailVerified: true,
    isActive: true,
    status: true,
    role: true,
    addressLine1: true,
    addressLine2: true,
    postalCode: true,
    city: true,
    country: true,
    createdAt: true,
    updatedAt: true,
  };

  async findAll(
    page = 1,
    limit = 25,
    search?: string,
    role?: string,
    status?: string,
  ) {
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };

    // Search filter on email, firstName, lastName
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { email: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Role filter
    if (role && role.trim()) {
      where.role = role.trim();
    }

    // Status filter
    if (status && status.trim()) {
      where.status = status.trim();
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: this.defaultSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
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
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: this.defaultSelect,
    });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }
    return { data: user };
  }

  async findBySupertokensId(supertokensId: string) {
    return this.prisma.user.findUnique({
      where: { supertokensId },
      select: this.defaultSelect,
    });
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    // Convert birthDate string to Date if provided
    const data: any = { ...dto };
    if (data.birthDate && typeof data.birthDate === 'string') {
      data.birthDate = new Date(data.birthDate);
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: this.defaultSelect,
    });

    return { data: updated };
  }

  async updateRole(id: string, newRole: string, adminId: string) {
    const validRoles = [
      'ANONYMOUS',
      'DONOR',
      'MEMBER',
      'VOLUNTEER',
      'COORDINATOR',
      'ADMIN',
      'SUPER_ADMIN',
    ];
    if (!validRoles.includes(newRole)) {
      throw new BadRequestException(
        `Role invalide: ${newRole}. Roles acceptes: ${validRoles.join(', ')}`,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    const oldRole = user.role;

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: newRole as any },
      select: this.defaultSelect,
    });

    // Audit log
    await this.audit.log(
      adminId,
      'USER_ROLE_CHANGED',
      'User',
      id,
      { role: oldRole },
      { role: newRole },
    );

    // Notify user of role change
    await this.notifications.create(
      id,
      'ROLE_CHANGE',
      'Role mis a jour',
      `Votre role a ete modifie de ${oldRole} a ${newRole}.`,
    );

    return { data: updated };
  }

  async updateStatus(id: string, newStatus: string, adminId: string) {
    const validStatuses = [
      'PENDING',
      'ACTIVE',
      'SUSPENDED',
      'INACTIVE',
      'DELETED',
    ];
    if (!validStatuses.includes(newStatus)) {
      throw new BadRequestException(
        `Statut invalide: ${newStatus}. Statuts acceptes: ${validStatuses.join(', ')}`,
      );
    }

    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    const oldStatus = user.status;

    const data: any = { status: newStatus as any };
    // Also update isActive based on status
    if (newStatus === 'SUSPENDED' || newStatus === 'INACTIVE' || newStatus === 'DELETED') {
      data.isActive = false;
    } else if (newStatus === 'ACTIVE') {
      data.isActive = true;
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data,
      select: this.defaultSelect,
    });

    // Audit log
    await this.audit.log(
      adminId,
      'USER_STATUS_CHANGED',
      'User',
      id,
      { status: oldStatus },
      { status: newStatus },
    );

    return { data: updated };
  }

  async updateAvatar(id: string, avatarUrl: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Utilisateur non trouve');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { avatarUrl },
      select: this.defaultSelect,
    });

    return { data: updated };
  }
}
