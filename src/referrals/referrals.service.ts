import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateReferralDto, UpdateReferralDto } from './dto/create-referral.dto.js';

@Injectable()
export class ReferralsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateReferralDto, referredById: string) {
    // Verify beneficiary
    const ben = await this.prisma.beneficiary.findUnique({ where: { id: dto.beneficiaryId } });
    if (!ben || ben.deletedAt) throw new NotFoundException('Beneficiaire non trouve');

    const referral = await this.prisma.referral.create({
      data: {
        encounterId: dto.encounterId ?? null,
        beneficiaryId: dto.beneficiaryId,
        structureId: dto.structureId ?? null,
        referredById,
        structureName: dto.structureName ?? null,
        reason: dto.reason ?? null,
        notes: dto.notes ?? null,
        appointmentDate: dto.appointmentDate ? new Date(dto.appointmentDate) : null,
      },
      include: {
        beneficiary: { select: { id: true, nickname: true } },
        structure: { select: { id: true, name: true, type: true } },
        referredBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    await this.audit.log(referredById, 'REFERRAL_CREATED', 'Referral', referral.id, undefined, { beneficiaryId: dto.beneficiaryId });
    return { data: referral };
  }

  async findAll(page = 1, limit = 25, status?: string, beneficiaryId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (beneficiaryId) where.beneficiaryId = beneficiaryId;

    const [data, totalCount] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        include: {
          beneficiary: { select: { id: true, nickname: true } },
          structure: { select: { id: true, name: true, type: true } },
          referredBy: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return { data, meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) } };
  }

  async update(id: string, dto: UpdateReferralDto, userId: string) {
    const referral = await this.prisma.referral.findUnique({ where: { id } });
    if (!referral) throw new NotFoundException('Orientation non trouvee');

    const updateData: any = {};
    if (dto.status !== undefined) {
      updateData.status = dto.status;
      if (dto.status === 'COMPLETED') updateData.completedAt = new Date();
    }
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.appointmentDate !== undefined) updateData.appointmentDate = new Date(dto.appointmentDate);
    if (dto.followUpNotes !== undefined) updateData.followUpNotes = dto.followUpNotes;
    if (dto.followUpDate !== undefined) updateData.followUpDate = new Date(dto.followUpDate);

    const updated = await this.prisma.referral.update({
      where: { id },
      data: updateData,
      include: {
        beneficiary: { select: { id: true, nickname: true } },
        structure: { select: { id: true, name: true, type: true } },
      },
    });

    await this.audit.log(userId, 'REFERRAL_UPDATED', 'Referral', id, undefined, updateData);
    return { data: updated };
  }

  async findPending(page = 1, limit = 25) {
    return this.findAll(page, limit, 'PROPOSED');
  }

  async findFollowUp(page = 1, limit = 25) {
    const skip = (page - 1) * limit;
    const where: any = {
      status: { in: ['PROPOSED', 'ACCEPTED'] },
      followUpDate: { lte: new Date() },
    };

    const [data, totalCount] = await Promise.all([
      this.prisma.referral.findMany({
        where,
        include: {
          beneficiary: { select: { id: true, nickname: true } },
          structure: { select: { id: true, name: true, type: true } },
          referredBy: { select: { id: true, firstName: true, lastName: true } },
        },
        skip,
        take: limit,
        orderBy: { followUpDate: 'asc' },
      }),
      this.prisma.referral.count({ where }),
    ]);

    return { data, meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) } };
  }
}
