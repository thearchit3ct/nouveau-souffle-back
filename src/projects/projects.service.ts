import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProjectDto } from './dto/create-project.dto.js';
import { UpdateProjectDto } from './dto/update-project.dto.js';

@Injectable()
export class ProjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const where = { status: { in: ['ACTIVE' as const, 'COMPLETED' as const] } };

    const [data, totalCount] = await Promise.all([
      this.prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      data,
      meta: { totalCount, page, perPage: limit, totalPages: Math.ceil(totalCount / limit) },
    };
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });
    if (!project) throw new NotFoundException('Projet non trouve');
    return { data: project };
  }

  async create(dto: CreateProjectDto) {
    const slug = this.generateSlug(dto.name);

    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        targetAmount: dto.targetAmount ?? null,
        startDate: dto.startDate ? new Date(dto.startDate) : null,
        endDate: dto.endDate ? new Date(dto.endDate) : null,
        imageUrl: dto.imageUrl ?? null,
        isFeatured: dto.isFeatured ?? false,
        status: 'DRAFT',
      },
    });

    return { data: project };
  }

  async update(id: string, dto: UpdateProjectDto) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Projet non trouve');

    const data: any = { ...dto };
    if (dto.name) data.slug = this.generateSlug(dto.name);
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate) data.endDate = new Date(dto.endDate);

    const updated = await this.prisma.project.update({ where: { id }, data });
    return { data: updated };
  }

  async archive(id: string) {
    const existing = await this.prisma.project.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Projet non trouve');

    const updated = await this.prisma.project.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });
    return { data: updated };
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
}
