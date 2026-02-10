import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto.js';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto.js';

@Injectable()
export class BeneficiariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateBeneficiaryDto, userId: string) {
    const beneficiary = await this.prisma.beneficiary.create({
      data: {
        nickname: dto.nickname,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        estimatedAge: dto.estimatedAge ?? null,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        gender: (dto.gender as any) ?? 'UNKNOWN',
        nationality: dto.nationality ?? null,
        spokenLanguages: dto.spokenLanguages ?? [],
        housingStatus: (dto.housingStatus as any) ?? 'UNKNOWN',
        administrativeStatus: (dto.administrativeStatus as any) ?? 'UNKNOWN',
        hasEmployment: dto.hasEmployment ?? null,
        healthNotes: dto.healthNotes ?? null,
        hasPets: dto.hasPets ?? false,
        petDetails: dto.petDetails ?? null,
        usualLocation: dto.usualLocation ?? null,
        usualLocationLat: dto.usualLocationLat ?? null,
        usualLocationLng: dto.usualLocationLng ?? null,
        gdprConsentStatus: (dto.gdprConsentStatus as any) ?? 'NOT_ASKED',
        gdprConsentDate: dto.gdprConsentStatus === 'GIVEN' || dto.gdprConsentStatus === 'ORAL' ? new Date() : null,
        notes: dto.notes ?? null,
        tags: dto.tags ?? [],
      },
    });

    await this.audit.log(userId, 'BENEFICIARY_CREATED', 'Beneficiary', beneficiary.id, undefined, { nickname: beneficiary.nickname });
    return { data: beneficiary };
  }

  async findAll(page = 1, limit = 25, search?: string, housingStatus?: string, tags?: string) {
    const skip = (page - 1) * limit;
    const where: any = { deletedAt: null };

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { nickname: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { usualLocation: { contains: term, mode: 'insensitive' } },
      ];
    }

    if (housingStatus) where.housingStatus = housingStatus;
    if (tags) where.tags = { hasSome: tags.split(',') };

    const [data, totalCount] = await Promise.all([
      this.prisma.beneficiary.findMany({
        where,
        select: {
          id: true,
          nickname: true,
          estimatedAge: true,
          gender: true,
          housingStatus: true,
          usualLocation: true,
          tags: true,
          gdprConsentStatus: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { encounters: true } },
        },
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.beneficiary.count({ where }),
    ]);

    return { data, meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) } };
  }

  async findOne(id: string) {
    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id },
      include: {
        encounters: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            maraude: { select: { id: true, title: true, plannedStartAt: true } },
            recordedBy: { select: { id: true, firstName: true, lastName: true } },
            needs: { include: { needCategory: true } },
            actions: { include: { actionCategory: true } },
          },
        },
        referrals: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            structure: { select: { id: true, name: true, type: true } },
          },
        },
      },
    });
    if (!beneficiary || beneficiary.deletedAt) throw new NotFoundException('Beneficiaire non trouve');
    return { data: beneficiary };
  }

  async update(id: string, dto: UpdateBeneficiaryDto, userId: string) {
    const beneficiary = await this.prisma.beneficiary.findUnique({ where: { id } });
    if (!beneficiary || beneficiary.deletedAt) throw new NotFoundException('Beneficiaire non trouve');

    const updateData: any = {};
    for (const [key, value] of Object.entries(dto)) {
      if (value !== undefined) {
        if (key === 'dateOfBirth' && value) {
          updateData[key] = new Date(value as string);
        } else if (key === 'gdprConsentStatus') {
          updateData[key] = value;
          if (value === 'GIVEN' || value === 'ORAL') {
            updateData.gdprConsentDate = new Date();
          }
        } else {
          updateData[key] = value;
        }
      }
    }

    const updated = await this.prisma.beneficiary.update({ where: { id }, data: updateData });
    await this.audit.log(userId, 'BENEFICIARY_UPDATED', 'Beneficiary', id, undefined, updateData);
    return { data: updated };
  }

  async getHistory(id: string, page = 1, limit = 25) {
    const beneficiary = await this.prisma.beneficiary.findUnique({ where: { id } });
    if (!beneficiary || beneficiary.deletedAt) throw new NotFoundException('Beneficiaire non trouve');

    const skip = (page - 1) * limit;
    const where = { beneficiaryId: id };

    const [data, totalCount] = await Promise.all([
      this.prisma.encounter.findMany({
        where,
        include: {
          maraude: { select: { id: true, title: true, plannedStartAt: true, zone: { select: { name: true } } } },
          recordedBy: { select: { id: true, firstName: true, lastName: true } },
          needs: { include: { needCategory: true } },
          actions: { include: { actionCategory: true } },
          referrals: { include: { structure: { select: { name: true, type: true } } } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.encounter.count({ where }),
    ]);

    return { data, meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) } };
  }

  async findNearby(lat: number, lng: number, radiusKm = 2) {
    // Simple bounding box approximation (1 degree lat ~ 111km)
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));

    const data = await this.prisma.beneficiary.findMany({
      where: {
        deletedAt: null,
        usualLocationLat: { gte: lat - latDelta, lte: lat + latDelta },
        usualLocationLng: { gte: lng - lngDelta, lte: lng + lngDelta },
      },
      select: {
        id: true,
        nickname: true,
        usualLocation: true,
        usualLocationLat: true,
        usualLocationLng: true,
        housingStatus: true,
        tags: true,
        _count: { select: { encounters: true } },
      },
      take: 50,
    });
    return { data };
  }

  async anonymize(id: string, adminId: string) {
    const beneficiary = await this.prisma.beneficiary.findUnique({ where: { id } });
    if (!beneficiary) throw new NotFoundException('Beneficiaire non trouve');

    const updated = await this.prisma.beneficiary.update({
      where: { id },
      data: {
        firstName: null,
        lastName: null,
        nickname: `ANONYME-${id.slice(0, 8)}`,
        healthNotes: null,
        notes: null,
        photoUrl: null,
        usualLocation: null,
        usualLocationLat: null,
        usualLocationLng: null,
        nationality: null,
        petDetails: null,
        anonymizedAt: new Date(),
        gdprConsentStatus: 'WITHDRAWN',
        deletedAt: new Date(),
      },
    });

    await this.audit.log(adminId, 'BENEFICIARY_ANONYMIZED', 'Beneficiary', id);
    return { data: updated };
  }

  async exportData(id: string) {
    const beneficiary = await this.prisma.beneficiary.findUnique({
      where: { id },
      include: {
        encounters: {
          include: {
            needs: { include: { needCategory: true } },
            actions: { include: { actionCategory: true } },
          },
        },
        referrals: {
          include: { structure: true },
        },
      },
    });
    if (!beneficiary) throw new NotFoundException('Beneficiaire non trouve');
    return { data: beneficiary };
  }
}
