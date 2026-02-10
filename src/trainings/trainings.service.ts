import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateTrainingDto } from './dto/create-training.dto.js';
import { UpdateTrainingDto } from './dto/update-training.dto.js';
import { CreateTrainingModuleDto } from './dto/create-training-module.dto.js';

@Injectable()
export class TrainingsService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Trainings CRUD ----

  async findAll(page = 1, limit = 25, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    // Public listing defaults to PUBLISHED only
    if (status) {
      where.status = status;
    } else {
      where.status = 'PUBLISHED';
    }

    const [data, total] = await Promise.all([
      this.prisma.training.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.training.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findAllAdmin(page = 1, limit = 25, status?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};

    if (status) {
      where.status = status;
    }

    const [data, total] = await Promise.all([
      this.prisma.training.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.training.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const training = await this.prisma.training.findUnique({
      where: { id },
      include: {
        modules: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!training) throw new NotFoundException('Formation non trouvee');

    const { _count, ...rest } = training;
    return { data: { ...rest, enrollmentCount: _count.enrollments } };
  }

  async findOneBySlug(slug: string) {
    const training = await this.prisma.training.findUnique({
      where: { slug },
      include: {
        modules: { orderBy: { sortOrder: 'asc' } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!training) throw new NotFoundException('Formation non trouvee');

    const { _count, ...rest } = training;
    return { data: { ...rest, enrollmentCount: _count.enrollments } };
  }

  async create(dto: CreateTrainingDto) {
    const slug = this.generateSlug(dto.title);

    const training = await this.prisma.training.create({
      data: {
        title: dto.title,
        slug,
        description: dto.description ?? null,
        imageUrl: dto.imageUrl ?? null,
        duration: dto.duration ?? null,
        difficulty: dto.difficulty ?? 'beginner',
        tags: dto.tags ?? [],
        status: 'DRAFT',
      },
    });

    return { data: training };
  }

  async update(id: string, dto: UpdateTrainingDto) {
    const existing = await this.prisma.training.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Formation non trouvee');

    const data: any = { ...dto };

    // Regenerate slug when title changes
    if (dto.title) {
      data.slug = this.generateSlug(dto.title);
    }

    // Set publishedAt when transitioning to PUBLISHED for the first time
    if (dto.status === 'PUBLISHED' && !existing.publishedAt) {
      data.publishedAt = new Date();
    }

    const updated = await this.prisma.training.update({ where: { id }, data });
    return { data: updated };
  }

  async remove(id: string) {
    const existing = await this.prisma.training.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Formation non trouvee');

    // Cascade delete handles modules, enrollments, and completions via Prisma schema
    await this.prisma.training.delete({ where: { id } });
    return { data: { message: 'Formation supprimee' } };
  }

  // ---- Training Modules ----

  async addModule(trainingId: string, dto: CreateTrainingModuleDto) {
    const training = await this.prisma.training.findUnique({ where: { id: trainingId } });
    if (!training) throw new NotFoundException('Formation non trouvee');

    const mod = await this.prisma.trainingModule.create({
      data: {
        trainingId,
        title: dto.title,
        type: (dto.type as any) ?? 'TEXT',
        content: dto.content ?? null,
        fileUrl: dto.fileUrl ?? null,
        duration: dto.duration ?? null,
        sortOrder: dto.sortOrder ?? 0,
      },
    });

    return { data: mod };
  }

  async updateModule(moduleId: string, dto: CreateTrainingModuleDto) {
    const existing = await this.prisma.trainingModule.findUnique({ where: { id: moduleId } });
    if (!existing) throw new NotFoundException('Module non trouve');

    const updated = await this.prisma.trainingModule.update({
      where: { id: moduleId },
      data: {
        title: dto.title ?? existing.title,
        type: dto.type ? (dto.type as any) : existing.type,
        content: dto.content !== undefined ? dto.content : existing.content,
        fileUrl: dto.fileUrl !== undefined ? dto.fileUrl : existing.fileUrl,
        duration: dto.duration !== undefined ? dto.duration : existing.duration,
        sortOrder: dto.sortOrder !== undefined ? dto.sortOrder : existing.sortOrder,
      },
    });

    return { data: updated };
  }

  async removeModule(moduleId: string) {
    const existing = await this.prisma.trainingModule.findUnique({ where: { id: moduleId } });
    if (!existing) throw new NotFoundException('Module non trouve');

    await this.prisma.trainingModule.delete({ where: { id: moduleId } });
    return { data: { message: 'Module supprime' } };
  }

  // ---- Enrollments ----

  async enroll(trainingId: string, userId: string, volunteerId?: string) {
    const training = await this.prisma.training.findUnique({ where: { id: trainingId } });
    if (!training) throw new NotFoundException('Formation non trouvee');
    if (training.status !== 'PUBLISHED') {
      throw new BadRequestException('Cette formation n\'est pas disponible');
    }

    // Prevent duplicate enrollment for the same user+training
    const existing = await this.prisma.trainingEnrollment.findUnique({
      where: { trainingId_userId: { trainingId, userId } },
    });
    if (existing) {
      throw new BadRequestException('Vous etes deja inscrit a cette formation');
    }

    const enrollment = await this.prisma.trainingEnrollment.create({
      data: {
        trainingId,
        userId,
        volunteerId: volunteerId ?? null,
        status: 'IN_PROGRESS',
        progress: 0,
      },
    });

    return { data: enrollment };
  }

  async getEnrollment(trainingId: string, userId: string) {
    const enrollment = await this.prisma.trainingEnrollment.findUnique({
      where: { trainingId_userId: { trainingId, userId } },
      include: { completions: true },
    });
    if (!enrollment) throw new NotFoundException('Inscription non trouvee');

    return { data: enrollment };
  }

  async getMyEnrollments(userId: string) {
    const enrollments = await this.prisma.trainingEnrollment.findMany({
      where: { userId },
      include: {
        training: {
          select: {
            id: true,
            title: true,
            slug: true,
            imageUrl: true,
            difficulty: true,
            duration: true,
            status: true,
          },
        },
      },
      orderBy: { startedAt: 'desc' },
    });

    return { data: enrollments };
  }

  async completeModule(enrollmentId: string, moduleId: string) {
    const enrollment = await this.prisma.trainingEnrollment.findUnique({
      where: { id: enrollmentId },
      include: { training: { include: { modules: true } } },
    });
    if (!enrollment) throw new NotFoundException('Inscription non trouvee');
    if (enrollment.status === 'COMPLETED') {
      throw new BadRequestException('Formation deja terminee');
    }

    // Verify the module belongs to the enrollment's training
    const moduleExists = enrollment.training.modules.find((m: any) => m.id === moduleId);
    if (!moduleExists) {
      throw new BadRequestException('Ce module ne fait pas partie de cette formation');
    }

    // Prevent marking the same module twice (unique constraint will also catch this)
    const alreadyCompleted = await this.prisma.trainingCompletion.findUnique({
      where: { enrollmentId_moduleId: { enrollmentId, moduleId } },
    });
    if (alreadyCompleted) {
      throw new BadRequestException('Module deja complete');
    }

    // Create completion record
    const completion = await this.prisma.trainingCompletion.create({
      data: { enrollmentId, moduleId },
    });

    // Recalculate progress: (completed modules / total modules) * 100
    const totalModules = enrollment.training.modules.length;
    const completedCount = await this.prisma.trainingCompletion.count({
      where: { enrollmentId },
    });
    const progress = totalModules > 0 ? Math.round((completedCount / totalModules) * 100) : 0;

    // Update enrollment progress and status
    const isComplete = completedCount >= totalModules && totalModules > 0;
    await this.prisma.trainingEnrollment.update({
      where: { id: enrollmentId },
      data: {
        progress,
        status: isComplete ? 'COMPLETED' : 'IN_PROGRESS',
        completedAt: isComplete ? new Date() : null,
      },
    });

    return {
      data: {
        completion,
        progress,
        completed: isComplete,
      },
    };
  }

  // ---- Stats (admin) ----

  async getStats() {
    const [totalTrainings, totalEnrollments, completedEnrollments] = await Promise.all([
      this.prisma.training.count(),
      this.prisma.trainingEnrollment.count(),
      this.prisma.trainingEnrollment.count({ where: { status: 'COMPLETED' } }),
    ]);

    const completionRate =
      totalEnrollments > 0
        ? Math.round((completedEnrollments / totalEnrollments) * 100)
        : 0;

    return {
      data: {
        totalTrainings,
        totalEnrollments,
        completedEnrollments,
        completionRate,
      },
    };
  }

  // ---- Utilities ----

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
