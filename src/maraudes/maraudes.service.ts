import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateMaraudeDto } from './dto/create-maraude.dto.js';
import { UpdateMaraudeDto } from './dto/update-maraude.dto.js';
import { CreateZoneDto, UpdateZoneDto } from './dto/create-zone.dto.js';
import { CreateReportDto } from './dto/create-report.dto.js';

@Injectable()
export class MaraudesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  // ========== MARAUDE SESSIONS ==========

  async create(dto: CreateMaraudeDto, coordinatorId: string) {
    const maraude = await this.prisma.maraude.create({
      data: {
        coordinatorId,
        zoneId: dto.zoneId ?? null,
        title: dto.title ?? null,
        description: dto.description ?? null,
        plannedStartAt: new Date(dto.plannedStartAt),
        plannedEndAt: dto.plannedEndAt ? new Date(dto.plannedEndAt) : null,
        startLocationName: dto.startLocationName ?? null,
        startLocationLat: dto.startLocationLat ?? null,
        startLocationLng: dto.startLocationLng ?? null,
        vehicleInfo: dto.vehicleInfo ?? null,
      },
      include: { zone: true, coordinator: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.audit.log(coordinatorId, 'MARAUDE_CREATED', 'Maraude', maraude.id, undefined, { title: maraude.title });
    return { data: maraude };
  }

  async findAll(page = 1, limit = 25, status?: string, zoneId?: string) {
    const skip = (page - 1) * limit;
    const where: any = {};
    if (status) where.status = status;
    if (zoneId) where.zoneId = zoneId;

    const [data, totalCount] = await Promise.all([
      this.prisma.maraude.findMany({
        where,
        include: {
          zone: true,
          coordinator: { select: { id: true, firstName: true, lastName: true } },
          _count: { select: { participants: true, encounters: true } },
        },
        skip,
        take: limit,
        orderBy: { plannedStartAt: 'desc' },
      }),
      this.prisma.maraude.count({ where }),
    ]);

    return { data, meta: { total: totalCount, page, limit, totalPages: Math.ceil(totalCount / limit) } };
  }

  async findUpcoming(limit = 10) {
    const data = await this.prisma.maraude.findMany({
      where: {
        status: { in: ['PLANNED', 'IN_PROGRESS'] },
        plannedStartAt: { gte: new Date() },
      },
      include: {
        zone: true,
        coordinator: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { participants: true } },
      },
      take: limit,
      orderBy: { plannedStartAt: 'asc' },
    });
    return { data };
  }

  async findOne(id: string) {
    const maraude = await this.prisma.maraude.findUnique({
      where: { id },
      include: {
        zone: true,
        coordinator: { select: { id: true, firstName: true, lastName: true, email: true } },
        participants: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true } },
            volunteer: { select: { id: true, firstName: true, lastName: true } },
          },
        },
        encounters: {
          include: {
            beneficiary: { select: { id: true, nickname: true } },
            recordedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        report: true,
        incidents: { orderBy: { occurredAt: 'desc' } },
      },
    });
    if (!maraude) throw new NotFoundException('Maraude non trouvee');
    return { data: maraude };
  }

  async update(id: string, dto: UpdateMaraudeDto, userId: string) {
    const maraude = await this.prisma.maraude.findUnique({ where: { id } });
    if (!maraude) throw new NotFoundException('Maraude non trouvee');

    const updateData: any = {};
    if (dto.zoneId !== undefined) updateData.zoneId = dto.zoneId;
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.plannedStartAt) updateData.plannedStartAt = new Date(dto.plannedStartAt);
    if (dto.plannedEndAt) updateData.plannedEndAt = new Date(dto.plannedEndAt);
    if (dto.startLocationName !== undefined) updateData.startLocationName = dto.startLocationName;
    if (dto.startLocationLat !== undefined) updateData.startLocationLat = dto.startLocationLat;
    if (dto.startLocationLng !== undefined) updateData.startLocationLng = dto.startLocationLng;
    if (dto.weatherConditions !== undefined) updateData.weatherConditions = dto.weatherConditions;
    if (dto.temperatureCelsius !== undefined) updateData.temperatureCelsius = dto.temperatureCelsius;
    if (dto.generalObservations !== undefined) updateData.generalObservations = dto.generalObservations;
    if (dto.vehicleInfo !== undefined) updateData.vehicleInfo = dto.vehicleInfo;
    if (dto.suppliesDistributed !== undefined) updateData.suppliesDistributed = dto.suppliesDistributed;

    const updated = await this.prisma.maraude.update({ where: { id }, data: updateData });
    return { data: updated };
  }

  async start(id: string, userId: string) {
    const maraude = await this.prisma.maraude.findUnique({ where: { id } });
    if (!maraude) throw new NotFoundException('Maraude non trouvee');
    if (maraude.status !== 'PLANNED') throw new BadRequestException('Seule une maraude PLANNED peut etre demarree');

    const updated = await this.prisma.maraude.update({
      where: { id },
      data: { status: 'IN_PROGRESS', actualStartAt: new Date() },
    });
    await this.audit.log(userId, 'MARAUDE_STARTED', 'Maraude', id, { status: 'PLANNED' }, { status: 'IN_PROGRESS' });
    return { data: updated };
  }

  async end(id: string, userId: string) {
    const maraude = await this.prisma.maraude.findUnique({ where: { id } });
    if (!maraude) throw new NotFoundException('Maraude non trouvee');
    if (maraude.status !== 'IN_PROGRESS') throw new BadRequestException('Seule une maraude IN_PROGRESS peut etre terminee');

    const updated = await this.prisma.maraude.update({
      where: { id },
      data: { status: 'COMPLETED', actualEndAt: new Date() },
    });

    // Auto-generate report skeleton
    const encounters = await this.prisma.encounter.findMany({ where: { maraudeId: id } });
    const newBeneficiaries = encounters.filter(e => e.type === 'FIRST_CONTACT').length;
    const followUps = encounters.filter(e => e.type === 'FOLLOW_UP').length;
    const emergencies = encounters.filter(e => e.type === 'EMERGENCY').length;
    const referralsCount = await this.prisma.referral.count({
      where: { encounter: { maraudeId: id } },
    });

    await this.prisma.maraudeReport.upsert({
      where: { maraudeId: id },
      update: {
        totalEncounters: encounters.length,
        newBeneficiaries,
        followUpEncounters: followUps,
        emergencyEncounters: emergencies,
        referralsMade: referralsCount,
      },
      create: {
        maraudeId: id,
        authorId: userId,
        totalEncounters: encounters.length,
        newBeneficiaries,
        followUpEncounters: followUps,
        emergencyEncounters: emergencies,
        referralsMade: referralsCount,
      },
    });

    await this.audit.log(userId, 'MARAUDE_ENDED', 'Maraude', id, { status: 'IN_PROGRESS' }, { status: 'COMPLETED' });
    return { data: updated };
  }

  async join(maraudeId: string, userId: string, role = 'VOLUNTEER') {
    const maraude = await this.prisma.maraude.findUnique({ where: { id: maraudeId } });
    if (!maraude) throw new NotFoundException('Maraude non trouvee');

    const existing = await this.prisma.maraudeParticipant.findUnique({
      where: { maraudeId_userId: { maraudeId, userId } },
    });
    if (existing) throw new BadRequestException('Deja inscrit a cette maraude');

    const participant = await this.prisma.maraudeParticipant.create({
      data: { maraudeId, userId, role },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    });
    return { data: participant };
  }

  async leave(maraudeId: string, userId: string) {
    const participant = await this.prisma.maraudeParticipant.findUnique({
      where: { maraudeId_userId: { maraudeId, userId } },
    });
    if (!participant) throw new NotFoundException('Participation non trouvee');

    await this.prisma.maraudeParticipant.delete({
      where: { maraudeId_userId: { maraudeId, userId } },
    });
    return { message: 'Vous avez quitte la maraude' };
  }

  async getEncounters(maraudeId: string) {
    const maraude = await this.prisma.maraude.findUnique({ where: { id: maraudeId } });
    if (!maraude) throw new NotFoundException('Maraude non trouvee');

    const data = await this.prisma.encounter.findMany({
      where: { maraudeId },
      include: {
        beneficiary: { select: { id: true, nickname: true, usualLocation: true } },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
        needs: { include: { needCategory: true } },
        actions: { include: { actionCategory: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
    return { data };
  }

  // ========== REPORT ==========

  async createReport(maraudeId: string, dto: CreateReportDto, authorId: string) {
    const maraude = await this.prisma.maraude.findUnique({ where: { id: maraudeId } });
    if (!maraude) throw new NotFoundException('Maraude non trouvee');

    const report = await this.prisma.maraudeReport.upsert({
      where: { maraudeId },
      update: {
        ...(dto.mealsDistributed !== undefined && { mealsDistributed: dto.mealsDistributed }),
        ...(dto.blanketsDistributed !== undefined && { blanketsDistributed: dto.blanketsDistributed }),
        ...(dto.hygieneKitsDistributed !== undefined && { hygieneKitsDistributed: dto.hygieneKitsDistributed }),
        ...(dto.otherDistributions !== undefined && { otherDistributions: dto.otherDistributions }),
        ...(dto.summary !== undefined && { summary: dto.summary }),
        ...(dto.pointsOfAttention !== undefined && { pointsOfAttention: dto.pointsOfAttention }),
        ...(dto.positiveHighlights !== undefined && { positiveHighlights: dto.positiveHighlights }),
        ...(dto.suggestions !== undefined && { suggestions: dto.suggestions }),
        submittedAt: new Date(),
      },
      create: {
        maraudeId,
        authorId,
        mealsDistributed: dto.mealsDistributed ?? 0,
        blanketsDistributed: dto.blanketsDistributed ?? 0,
        hygieneKitsDistributed: dto.hygieneKitsDistributed ?? 0,
        otherDistributions: dto.otherDistributions ?? {},
        summary: dto.summary ?? null,
        pointsOfAttention: dto.pointsOfAttention ?? null,
        positiveHighlights: dto.positiveHighlights ?? null,
        suggestions: dto.suggestions ?? null,
        submittedAt: new Date(),
      },
    });
    return { data: report };
  }

  // ========== ZONES ==========

  async findAllZones() {
    const data = await this.prisma.maraudeZone.findMany({ orderBy: { name: 'asc' } });
    return { data };
  }

  async createZone(dto: CreateZoneDto) {
    const zone = await this.prisma.maraudeZone.create({
      data: {
        name: dto.name,
        description: dto.description ?? null,
        color: dto.color ?? null,
        centerLat: dto.centerLat ?? null,
        centerLng: dto.centerLng ?? null,
        radiusKm: dto.radiusKm ?? null,
      },
    });
    return { data: zone };
  }

  async updateZone(id: string, dto: UpdateZoneDto) {
    const zone = await this.prisma.maraudeZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Zone non trouvee');

    const updated = await this.prisma.maraudeZone.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.color !== undefined && { color: dto.color }),
        ...(dto.centerLat !== undefined && { centerLat: dto.centerLat }),
        ...(dto.centerLng !== undefined && { centerLng: dto.centerLng }),
        ...(dto.radiusKm !== undefined && { radiusKm: dto.radiusKm }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return { data: updated };
  }

  async deleteZone(id: string) {
    const zone = await this.prisma.maraudeZone.findUnique({ where: { id } });
    if (!zone) throw new NotFoundException('Zone non trouvee');
    await this.prisma.maraudeZone.delete({ where: { id } });
    return { message: 'Zone supprimee' };
  }
}
