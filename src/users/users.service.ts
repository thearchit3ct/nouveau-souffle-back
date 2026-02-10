import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly defaultSelect = {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    phone: true,
    civility: true,
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

  async findAll(page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const [data, totalCount] = await Promise.all([
      this.prisma.user.findMany({
        where: { deletedAt: null },
        select: this.defaultSelect,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where: { deletedAt: null } }),
    ]);

    return {
      data,
      meta: {
        totalCount,
        page,
        perPage: limit,
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

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto as any,
      select: this.defaultSelect,
    });

    return { data: updated };
  }
}
