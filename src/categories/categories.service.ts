import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const data = await this.prisma.category.findMany({
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: { select: { articles: true } },
      },
    });
    return { data };
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        articles: {
          where: { article: { status: 'PUBLISHED' } },
          include: {
            article: {
              select: {
                id: true,
                title: true,
                slug: true,
                excerpt: true,
                featuredImageUrl: true,
                publishedAt: true,
                viewCount: true,
                author: { select: { firstName: true, lastName: true } },
              },
            },
          },
          orderBy: { article: { publishedAt: 'desc' } },
        },
      },
    });

    if (!category) throw new NotFoundException('Categorie non trouvee');
    return { data: category };
  }

  async create(dto: CreateCategoryDto) {
    const slug = this.generateSlug(dto.name);
    const category = await this.prisma.category.create({
      data: {
        name: dto.name,
        slug,
        description: dto.description ?? null,
        color: dto.color ?? null,
        parentId: dto.parentId ?? null,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
    return { data: category };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Categorie non trouvee');

    const data: any = { ...dto };
    if (dto.name) data.slug = this.generateSlug(dto.name);

    const updated = await this.prisma.category.update({ where: { id }, data });
    return { data: updated };
  }

  async remove(id: string) {
    const existing = await this.prisma.category.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Categorie non trouvee');

    await this.prisma.category.delete({ where: { id } });
    return { data: { deleted: true } };
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
