import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateEventDto } from './dto/create-event.dto.js';
import { UpdateEventDto } from './dto/update-event.dto.js';
import { randomUUID } from 'crypto';

@Injectable()
export class EventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async findAll(page = 1, limit = 25, status?: string, type?: string, visibility?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    else where.status = { in: ['PUBLISHED', 'ONGOING'] };
    if (type) where.type = type;
    if (visibility) where.visibility = visibility;

    const [data, totalCount] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { startDatetime: 'asc' },
      }),
      this.prisma.event.count({ where }),
    ]);

    return {
      data,
      meta: { totalCount, page, perPage: limit, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async findOne(id: string, userRole?: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evenement non trouve');

    // Visibility check: MEMBERS events only for MEMBER+ users
    if (event.visibility === 'MEMBERS') {
      const memberRoles = ['MEMBER', 'VOLUNTEER', 'COORDINATOR', 'ADMIN', 'SUPER_ADMIN'];
      if (!userRole || !memberRoles.includes(userRole)) {
        throw new ForbiddenException('Evenement reserve aux membres');
      }
    }

    return { data: event };
  }

  async create(dto: CreateEventDto, adminId: string) {
    const slug = this.generateSlug(dto.title);

    const event = await this.prisma.event.create({
      data: {
        createdById: adminId,
        title: dto.title,
        slug,
        description: dto.description ?? null,
        type: (dto.type as any) ?? 'OTHER',
        visibility: (dto.visibility as any) ?? 'PUBLIC',
        status: 'DRAFT',
        startDatetime: new Date(dto.startDatetime),
        endDatetime: dto.endDatetime ? new Date(dto.endDatetime) : null,
        locationName: dto.locationName ?? null,
        locationAddress: dto.locationAddress ?? null,
        capacity: dto.capacity ?? null,
        price: dto.price ?? 0,
        isFree: dto.isFree ?? true,
        imageUrl: dto.imageUrl ?? null,
        program: dto.program ?? null,
      },
    });

    return { data: event };
  }

  async update(id: string, dto: UpdateEventDto) {
    const existing = await this.prisma.event.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Evenement non trouve');

    const data: any = { ...dto };
    if (dto.title) data.slug = this.generateSlug(dto.title);
    if (dto.startDatetime) data.startDatetime = new Date(dto.startDatetime);
    if (dto.endDatetime) data.endDatetime = new Date(dto.endDatetime);
    if (dto.status === 'PUBLISHED' && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const updated = await this.prisma.event.update({ where: { id }, data });
    return { data: updated };
  }

  async cancel(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) throw new NotFoundException('Evenement non trouve');

    const updated = await this.prisma.event.update({
      where: { id },
      data: { status: 'CANCELED' },
    });

    // Notify registered users
    const registrations = await this.prisma.eventRegistration.findMany({
      where: { eventId: id, status: { in: ['CONFIRMED', 'WAITLISTED'] } },
    });

    for (const reg of registrations) {
      if (reg.userId) {
        await this.notifications.create(
          reg.userId,
          'EVENT_CANCELED',
          'Evenement annule',
          `L'evenement "${event.title}" a ete annule.`,
          { eventId: id },
        );
      }
    }

    return { data: updated };
  }

  async register(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) throw new NotFoundException('Evenement non trouve');
    if (event.status !== 'PUBLISHED' && event.status !== 'ONGOING') {
      throw new BadRequestException('Les inscriptions ne sont pas ouvertes');
    }

    // Check if already registered
    const existing = await this.prisma.eventRegistration.findFirst({
      where: { eventId, userId, status: { in: ['CONFIRMED', 'WAITLISTED', 'PENDING'] } },
    });
    if (existing) throw new BadRequestException('Vous etes deja inscrit a cet evenement');

    // Determine status based on capacity
    let status: 'CONFIRMED' | 'WAITLISTED' = 'CONFIRMED';
    if (event.capacity && event.registrationsCount >= event.capacity) {
      status = 'WAITLISTED';
    }

    const registration = await this.prisma.eventRegistration.create({
      data: {
        eventId,
        userId,
        status,
        confirmationToken: randomUUID(),
      },
    });

    // Increment registrations count
    await this.prisma.event.update({
      where: { id: eventId },
      data: { registrationsCount: { increment: 1 } },
    });

    await this.notifications.create(
      userId,
      status === 'CONFIRMED' ? 'EVENT_REGISTERED' : 'EVENT_WAITLISTED',
      status === 'CONFIRMED' ? 'Inscription confirmee' : 'En liste d\'attente',
      status === 'CONFIRMED'
        ? `Vous etes inscrit a "${event.title}".`
        : `Vous etes en liste d'attente pour "${event.title}".`,
      { eventId, registrationId: registration.id },
      `/evenements/${event.slug}`,
    );

    return { data: registration };
  }

  async cancelRegistration(eventId: string, userId: string) {
    const registration = await this.prisma.eventRegistration.findFirst({
      where: { eventId, userId, status: { in: ['CONFIRMED', 'WAITLISTED'] } },
    });
    if (!registration) throw new NotFoundException('Inscription non trouvee');

    await this.prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { status: 'CANCELED', canceledAt: new Date() },
    });

    // Decrement count
    await this.prisma.event.update({
      where: { id: eventId },
      data: { registrationsCount: { decrement: 1 } },
    });

    // Promote first waitlisted person if the canceled registration was CONFIRMED
    if (registration.status === 'CONFIRMED') {
      const nextWaitlisted = await this.prisma.eventRegistration.findFirst({
        where: { eventId, status: 'WAITLISTED' },
        orderBy: { registeredAt: 'asc' },
      });
      if (nextWaitlisted) {
        await this.prisma.eventRegistration.update({
          where: { id: nextWaitlisted.id },
          data: { status: 'CONFIRMED' },
        });
        if (nextWaitlisted.userId) {
          await this.notifications.create(
            nextWaitlisted.userId,
            'EVENT_PROMOTED',
            'Inscription confirmee',
            'Une place s\'est liberee ! Votre inscription est maintenant confirmee.',
            { eventId, registrationId: nextWaitlisted.id },
          );
        }
      }
    }

    return { data: { message: 'Inscription annulee' } };
  }

  async getRegistrations(eventId: string, page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const where = { eventId };

    const [data, totalCount] = await Promise.all([
      this.prisma.eventRegistration.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { registeredAt: 'asc' },
      }),
      this.prisma.eventRegistration.count({ where }),
    ]);

    return {
      data,
      meta: { totalCount, page, perPage: limit, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async checkIn(registrationId: string) {
    const reg = await this.prisma.eventRegistration.findUnique({
      where: { id: registrationId },
    });
    if (!reg) throw new NotFoundException('Inscription non trouvee');
    if (reg.status !== 'CONFIRMED') {
      throw new BadRequestException('Seule une inscription confirmee peut etre pointee');
    }

    const updated = await this.prisma.eventRegistration.update({
      where: { id: registrationId },
      data: { checkedInAt: new Date() },
    });

    return { data: updated };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
