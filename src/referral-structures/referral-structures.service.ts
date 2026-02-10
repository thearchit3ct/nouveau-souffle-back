import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateReferralStructureDto, UpdateReferralStructureDto } from './dto/create-referral-structure.dto.js';

@Injectable()
export class ReferralStructuresService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(page = 1, limit = 25, type?: string, search?: string) {
    const skip = (page - 1) * limit;
    const where: any = { isActive: true };
    if (type) where.type = type;
    if (search?.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: 'insensitive' } },
        { address: { contains: search.trim(), mode: 'insensitive' } },
      ];
    }

    const [data, totalCount] = await Promise.all([
      this.prisma.referralStructure.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.referralStructure.count({ where }),
    ]);

    return { data, meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) } };
  }

  async findNearby(lat: number, lng: number, radiusKm = 5) {
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const data = await this.prisma.referralStructure.findMany({
      where: {
        isActive: true,
        latitude: { gte: lat - latDelta, lte: lat + latDelta },
        longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
      take: 50,
      orderBy: { name: 'asc' },
    });
    return { data };
  }

  async create(dto: CreateReferralStructureDto) {
    const structure = await this.prisma.referralStructure.create({
      data: {
        name: dto.name,
        type: dto.type,
        address: dto.address ?? null,
        phone: dto.phone ?? null,
        email: dto.email ?? null,
        website: dto.website ?? null,
        openingHours: dto.openingHours ?? null,
        capacity: dto.capacity ?? null,
        admissionCriteria: dto.admissionCriteria ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
      },
    });
    return { data: structure };
  }

  async update(id: string, dto: UpdateReferralStructureDto) {
    const structure = await this.prisma.referralStructure.findUnique({ where: { id } });
    if (!structure) throw new NotFoundException('Structure non trouvee');

    const updateData: any = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) updateData[key] = value;
    }

    const updated = await this.prisma.referralStructure.update({ where: { id }, data: updateData });
    return { data: updated };
  }
}
