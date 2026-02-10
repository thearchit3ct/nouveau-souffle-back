import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    type: string,
    title: string,
    message?: string,
    data?: Record<string, unknown>,
    actionUrl?: string,
  ) {
    return this.prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message: message ?? null,
        data: data ? (data as any) : undefined,
        actionUrl: actionUrl ?? null,
      },
    });
  }

  async findByUser(userId: string, page = 1, limit = 25, isRead?: boolean) {
    const skip = (page - 1) * limit;
    const where: any = { userId };
    if (isRead !== undefined) where.isRead = isRead;

    const [data, totalCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
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

  async markAsRead(id: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id, userId },
    });
    if (!notif) throw new NotFoundException('Notification non trouvee');

    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });
    return { data: updated };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
    return { data: { count: result.count } };
  }

  async countUnread(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { data: { count } };
  }
}
