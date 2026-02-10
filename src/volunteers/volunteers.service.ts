import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { CreateVolunteerDto } from './dto/create-volunteer.dto.js';
import { UpdateVolunteerDto } from './dto/update-volunteer.dto.js';
import { CreateAssignmentDto } from './dto/create-assignment.dto.js';

@Injectable()
export class VolunteersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Public application to become a volunteer.
   * Attempts to link the volunteer record to an existing user by email.
   */
  async apply(dto: CreateVolunteerDto) {
    // Check if a volunteer application with this email already exists and is not rejected
    const existing = await this.prisma.volunteer.findFirst({
      where: {
        email: dto.email,
        status: { in: ['PENDING', 'APPROVED', 'PAUSED'] },
      },
    });
    if (existing) {
      throw new BadRequestException(
        'Une candidature benevole avec cet email existe deja',
      );
    }

    // Try to find existing user by email for automatic linking
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      select: { id: true },
    });

    const volunteer = await this.prisma.volunteer.create({
      data: {
        email: dto.email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone ?? null,
        skills: dto.skills ?? [],
        availabilities: dto.availabilities ?? {},
        motivation: dto.motivation ?? null,
        userId: user?.id ?? null,
      },
    });

    return { data: volunteer };
  }

  /**
   * Paginated list of volunteers with optional filters.
   * Accessible by COORDINATOR, ADMIN, SUPER_ADMIN.
   */
  async findAll(
    page = 1,
    limit = 25,
    status?: string,
    search?: string,
  ) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.volunteer.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.volunteer.count({ where }),
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

  /**
   * Get full volunteer details with all relations.
   */
  async findOne(id: string) {
    const volunteer = await this.prisma.volunteer.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        approvedBy: { select: { id: true, email: true, firstName: true, lastName: true } },
        assignments: {
          include: {
            event: { select: { id: true, title: true, slug: true, startDatetime: true } },
            project: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!volunteer) {
      throw new NotFoundException('Benevole non trouve');
    }

    return { data: volunteer };
  }

  /**
   * Update volunteer fields (coordinator notes, skills, availabilities).
   */
  async update(id: string, dto: UpdateVolunteerDto) {
    const volunteer = await this.prisma.volunteer.findUnique({ where: { id } });
    if (!volunteer) {
      throw new NotFoundException('Benevole non trouve');
    }

    const updated = await this.prisma.volunteer.update({
      where: { id },
      data: {
        ...(dto.coordinatorNotes !== undefined && { coordinatorNotes: dto.coordinatorNotes }),
        ...(dto.skills !== undefined && { skills: dto.skills }),
        ...(dto.availabilities !== undefined && { availabilities: dto.availabilities }),
      },
    });

    return { data: updated };
  }

  /**
   * Approve a volunteer application.
   * If the volunteer is linked to a user, upgrades their role to VOLUNTEER
   * only if their current role is lower in the hierarchy.
   */
  async approve(id: string, adminId: string) {
    const volunteer = await this.prisma.volunteer.findUnique({ where: { id } });
    if (!volunteer) {
      throw new NotFoundException('Benevole non trouve');
    }
    if (volunteer.status === 'APPROVED') {
      throw new BadRequestException('Ce benevole est deja approuve');
    }
    if (volunteer.status === 'REJECTED') {
      throw new BadRequestException(
        'Ce benevole a ete rejete. Creez une nouvelle candidature.',
      );
    }

    const updated = await this.prisma.volunteer.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedAt: new Date(),
        approvedById: adminId,
      },
    });

    // Upgrade linked user's role to VOLUNTEER if they currently have a lower role
    if (volunteer.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: volunteer.userId },
        select: { id: true, role: true },
      });

      if (user) {
        const lowerRoles = ['ANONYMOUS', 'DONOR', 'MEMBER'];
        if (lowerRoles.includes(user.role)) {
          await this.prisma.user.update({
            where: { id: user.id },
            data: { role: 'VOLUNTEER' as any },
          });
        }

        // Notify the volunteer's user account
        await this.notifications.create(
          user.id,
          'VOLUNTEER_APPROVED',
          'Candidature benevole approuvee',
          'Votre candidature benevole a ete approuvee. Bienvenue dans l\'equipe !',
          { volunteerId: id },
        );
      }
    }

    // Audit trail
    await this.audit.log(
      adminId,
      'VOLUNTEER_APPROVED',
      'Volunteer',
      id,
      { status: volunteer.status },
      { status: 'APPROVED' },
    );

    return { data: updated };
  }

  /**
   * Reject a volunteer application.
   */
  async reject(id: string, adminId: string) {
    const volunteer = await this.prisma.volunteer.findUnique({ where: { id } });
    if (!volunteer) {
      throw new NotFoundException('Benevole non trouve');
    }
    if (volunteer.status === 'REJECTED') {
      throw new BadRequestException('Ce benevole est deja rejete');
    }

    const updated = await this.prisma.volunteer.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectedAt: new Date(),
      },
    });

    // Notify linked user if exists
    if (volunteer.userId) {
      await this.notifications.create(
        volunteer.userId,
        'VOLUNTEER_REJECTED',
        'Candidature benevole refusee',
        'Votre candidature benevole n\'a pas ete retenue pour le moment.',
        { volunteerId: id },
      );
    }

    await this.audit.log(
      adminId,
      'VOLUNTEER_REJECTED',
      'Volunteer',
      id,
      { status: volunteer.status },
      { status: 'REJECTED' },
    );

    return { data: updated };
  }

  /**
   * Pause a volunteer (temporarily deactivate).
   */
  async pause(id: string, adminId: string) {
    const volunteer = await this.prisma.volunteer.findUnique({ where: { id } });
    if (!volunteer) {
      throw new NotFoundException('Benevole non trouve');
    }
    if (volunteer.status !== 'APPROVED') {
      throw new BadRequestException(
        'Seul un benevole approuve peut etre mis en pause',
      );
    }

    const updated = await this.prisma.volunteer.update({
      where: { id },
      data: { status: 'PAUSED' },
    });

    await this.audit.log(
      adminId,
      'VOLUNTEER_PAUSED',
      'Volunteer',
      id,
      { status: 'APPROVED' },
      { status: 'PAUSED' },
    );

    return { data: updated };
  }

  /**
   * Assign a volunteer to an event or project.
   * Volunteer must be in APPROVED status.
   */
  async createAssignment(volunteerId: string, dto: CreateAssignmentDto) {
    const volunteer = await this.prisma.volunteer.findUnique({
      where: { id: volunteerId },
    });
    if (!volunteer) {
      throw new NotFoundException('Benevole non trouve');
    }
    if (volunteer.status !== 'APPROVED') {
      throw new BadRequestException(
        'Seul un benevole approuve peut etre affecte a une mission',
      );
    }

    if (!dto.eventId && !dto.projectId) {
      throw new BadRequestException(
        'Un evenement ou un projet doit etre specifie',
      );
    }

    // Validate referenced event/project exist
    if (dto.eventId) {
      const event = await this.prisma.event.findUnique({
        where: { id: dto.eventId },
      });
      if (!event) {
        throw new NotFoundException('Evenement non trouve');
      }
    }
    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: dto.projectId },
      });
      if (!project) {
        throw new NotFoundException('Projet non trouve');
      }
    }

    const assignment = await this.prisma.volunteerAssignment.create({
      data: {
        volunteerId,
        eventId: dto.eventId ?? null,
        projectId: dto.projectId ?? null,
        role: dto.role ?? null,
        notes: dto.notes ?? null,
      },
      include: {
        event: { select: { id: true, title: true, slug: true, startDatetime: true } },
        project: { select: { id: true, name: true, slug: true } },
      },
    });

    // Notify volunteer if linked to a user
    if (volunteer.userId) {
      const target = dto.eventId ? 'un evenement' : 'un projet';
      await this.notifications.create(
        volunteer.userId,
        'VOLUNTEER_ASSIGNED',
        'Nouvelle mission benevole',
        `Vous avez ete affecte a ${target}.`,
        { assignmentId: assignment.id, volunteerId },
      );
    }

    return { data: assignment };
  }

  /**
   * Get paginated assignments for a volunteer.
   */
  async getAssignments(volunteerId: string, page = 1, limit = 25) {
    const volunteer = await this.prisma.volunteer.findUnique({
      where: { id: volunteerId },
    });
    if (!volunteer) {
      throw new NotFoundException('Benevole non trouve');
    }

    const skip = (page - 1) * limit;
    const where = { volunteerId };

    const [data, totalCount] = await Promise.all([
      this.prisma.volunteerAssignment.findMany({
        where,
        include: {
          event: { select: { id: true, title: true, slug: true, startDatetime: true } },
          project: { select: { id: true, name: true, slug: true } },
        },
        skip,
        take: limit,
        orderBy: { assignedAt: 'desc' },
      }),
      this.prisma.volunteerAssignment.count({ where }),
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

  /**
   * Mark an assignment as completed.
   */
  async completeAssignment(assignmentId: string) {
    const assignment = await this.prisma.volunteerAssignment.findUnique({
      where: { id: assignmentId },
    });
    if (!assignment) {
      throw new NotFoundException('Mission non trouvee');
    }
    if (assignment.status === 'COMPLETED') {
      throw new BadRequestException('Cette mission est deja terminee');
    }

    const updated = await this.prisma.volunteerAssignment.update({
      where: { id: assignmentId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    return { data: updated };
  }

  /**
   * Get volunteer profile for the currently authenticated user.
   */
  async getMyProfile(userId: string) {
    const volunteer = await this.prisma.volunteer.findFirst({
      where: { userId },
      include: {
        assignments: {
          include: {
            event: { select: { id: true, title: true, slug: true, startDatetime: true } },
            project: { select: { id: true, name: true, slug: true } },
          },
          orderBy: { assignedAt: 'desc' },
        },
      },
    });

    if (!volunteer) {
      throw new NotFoundException(
        'Aucun profil benevole associe a votre compte',
      );
    }

    return { data: volunteer };
  }
}
