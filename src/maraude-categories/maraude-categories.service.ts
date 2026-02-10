import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateNeedCategoryDto, CreateActionCategoryDto, UpdateCategoryDto } from './dto/create-category.dto.js';

@Injectable()
export class MaraudeCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // ========== NEED CATEGORIES ==========

  async findAllNeeds() {
    const data = await this.prisma.needCategory.findMany({
      where: { isActive: true },
      include: { children: { where: { isActive: true }, orderBy: { displayOrder: 'asc' } } },
      orderBy: { displayOrder: 'asc' },
    });
    // Return only top-level (no parent)
    return { data: data.filter((c: any) => !c.parentId) };
  }

  async createNeed(dto: CreateNeedCategoryDto) {
    const category = await this.prisma.needCategory.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        parentId: dto.parentId ?? null,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
    return { data: category };
  }

  async updateNeed(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.needCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categorie non trouvee');

    const updateData: any = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) updateData[key] = value;
    }

    const updated = await this.prisma.needCategory.update({ where: { id }, data: updateData });
    return { data: updated };
  }

  // ========== ACTION CATEGORIES ==========

  async findAllActions() {
    const data = await this.prisma.actionCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
    });
    return { data };
  }

  async createAction(dto: CreateActionCategoryDto) {
    const category = await this.prisma.actionCategory.create({
      data: {
        code: dto.code,
        name: dto.name,
        description: dto.description ?? null,
        icon: dto.icon ?? null,
        color: dto.color ?? null,
        displayOrder: dto.displayOrder ?? 0,
      },
    });
    return { data: category };
  }

  async updateAction(id: string, dto: UpdateCategoryDto) {
    const cat = await this.prisma.actionCategory.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('Categorie non trouvee');

    const updateData: any = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) updateData[key] = value;
    }

    const updated = await this.prisma.actionCategory.update({ where: { id }, data: updateData });
    return { data: updated };
  }
}
