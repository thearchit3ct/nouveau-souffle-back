import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuditService } from '../common/audit/audit.service.js';
import { CreateEncounterDto } from './dto/create-encounter.dto.js';
import { QuickEncounterDto } from './dto/quick-encounter.dto.js';

@Injectable()
export class EncountersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async create(dto: CreateEncounterDto, recordedById: string) {
    // Verify maraude exists and is active
    const maraude = await this.prisma.maraude.findUnique({ where: { id: dto.maraudeId } });
    if (!maraude) throw new NotFoundException('Maraude non trouvee');
    if (maraude.status !== 'IN_PROGRESS' && maraude.status !== 'PLANNED') {
      throw new BadRequestException('La maraude n\'est pas active');
    }

    // If beneficiaryId provided, verify it exists
    if (dto.beneficiaryId) {
      const ben = await this.prisma.beneficiary.findUnique({ where: { id: dto.beneficiaryId } });
      if (!ben || ben.deletedAt) throw new NotFoundException('Beneficiaire non trouve');
    }

    const encounter = await this.prisma.encounter.create({
      data: {
        maraudeId: dto.maraudeId,
        beneficiaryId: dto.beneficiaryId ?? null,
        recordedById,
        type: (dto.type as any) ?? 'FIRST_CONTACT',
        urgencyLevel: (dto.urgencyLevel as any) ?? 'LOW',
        locationName: dto.locationName ?? null,
        locationLat: dto.locationLat ?? null,
        locationLng: dto.locationLng ?? null,
        physicalState: dto.physicalState ?? null,
        mentalState: dto.mentalState ?? null,
        socialContext: dto.socialContext ?? null,
        notes: dto.notes ?? null,
        privateNotes: dto.privateNotes ?? null,
        itemsDistributed: dto.itemsDistributed ?? {},
        durationMinutes: dto.durationMinutes ?? null,
      },
      include: {
        beneficiary: { select: { id: true, nickname: true } },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Add needs if provided
    if (dto.needCategoryIds?.length) {
      await this.prisma.encounterNeed.createMany({
        data: dto.needCategoryIds.map((needCategoryId, i) => ({
          encounterId: encounter.id,
          needCategoryId,
          priority: 0,
        })),
        skipDuplicates: true,
      });
    }

    // Add actions if provided
    if (dto.actionCategoryIds?.length) {
      await this.prisma.encounterAction.createMany({
        data: dto.actionCategoryIds.map(actionCategoryId => ({
          encounterId: encounter.id,
          actionCategoryId,
          quantity: 1,
        })),
        skipDuplicates: true,
      });
    }

    await this.audit.log(recordedById, 'ENCOUNTER_CREATED', 'Encounter', encounter.id, undefined, { maraudeId: dto.maraudeId });

    // Return with relations
    return this.findOne(encounter.id);
  }

  async quickCreate(dto: QuickEncounterDto, recordedById: string) {
    const maraude = await this.prisma.maraude.findUnique({ where: { id: dto.maraudeId } });
    if (!maraude) throw new NotFoundException('Maraude non trouvee');

    let beneficiaryId = dto.beneficiaryId ?? null;

    // Create new beneficiary on-the-fly if nickname provided
    if (!beneficiaryId && dto.newBeneficiaryNickname) {
      const newBen = await this.prisma.beneficiary.create({
        data: { nickname: dto.newBeneficiaryNickname },
      });
      beneficiaryId = newBen.id;
    }

    const encounter = await this.prisma.encounter.create({
      data: {
        maraudeId: dto.maraudeId,
        beneficiaryId,
        recordedById,
        type: beneficiaryId ? 'FOLLOW_UP' : 'FIRST_CONTACT',
        locationLat: dto.locationLat ?? null,
        locationLng: dto.locationLng ?? null,
        notes: dto.notes ?? null,
      },
    });

    // Resolve need categories by code
    if (dto.needCodes?.length) {
      const needCats = await this.prisma.needCategory.findMany({
        where: { code: { in: dto.needCodes }, isActive: true },
      });
      if (needCats.length) {
        await this.prisma.encounterNeed.createMany({
          data: needCats.map((cat: { id: string }) => ({ encounterId: encounter.id, needCategoryId: cat.id })),
          skipDuplicates: true,
        });
      }
    }

    // Resolve action categories by code
    if (dto.actionCodes?.length) {
      const actCats = await this.prisma.actionCategory.findMany({
        where: { code: { in: dto.actionCodes }, isActive: true },
      });
      if (actCats.length) {
        await this.prisma.encounterAction.createMany({
          data: actCats.map((cat: { id: string }) => ({ encounterId: encounter.id, actionCategoryId: cat.id })),
          skipDuplicates: true,
        });
      }
    }

    return this.findOne(encounter.id);
  }

  async findOne(id: string) {
    const encounter = await this.prisma.encounter.findUnique({
      where: { id },
      include: {
        maraude: { select: { id: true, title: true, plannedStartAt: true } },
        beneficiary: { select: { id: true, nickname: true, usualLocation: true } },
        recordedBy: { select: { id: true, firstName: true, lastName: true } },
        needs: { include: { needCategory: true } },
        actions: { include: { actionCategory: true } },
        referrals: { include: { structure: { select: { id: true, name: true, type: true } } } },
      },
    });
    if (!encounter) throw new NotFoundException('Rencontre non trouvee');
    return { data: encounter };
  }

  async update(id: string, dto: Partial<CreateEncounterDto>, userId: string) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id } });
    if (!encounter) throw new NotFoundException('Rencontre non trouvee');

    const updateData: any = {};
    if (dto.type !== undefined) updateData.type = dto.type;
    if (dto.urgencyLevel !== undefined) updateData.urgencyLevel = dto.urgencyLevel;
    if (dto.locationName !== undefined) updateData.locationName = dto.locationName;
    if (dto.locationLat !== undefined) updateData.locationLat = dto.locationLat;
    if (dto.locationLng !== undefined) updateData.locationLng = dto.locationLng;
    if (dto.physicalState !== undefined) updateData.physicalState = dto.physicalState;
    if (dto.mentalState !== undefined) updateData.mentalState = dto.mentalState;
    if (dto.socialContext !== undefined) updateData.socialContext = dto.socialContext;
    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.privateNotes !== undefined) updateData.privateNotes = dto.privateNotes;
    if (dto.itemsDistributed !== undefined) updateData.itemsDistributed = dto.itemsDistributed;
    if (dto.durationMinutes !== undefined) updateData.durationMinutes = dto.durationMinutes;

    await this.prisma.encounter.update({ where: { id }, data: updateData });
    return this.findOne(id);
  }

  async addNeeds(encounterId: string, needCategoryIds: string[]) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException('Rencontre non trouvee');

    await this.prisma.encounterNeed.createMany({
      data: needCategoryIds.map(needCategoryId => ({
        encounterId,
        needCategoryId,
      })),
      skipDuplicates: true,
    });

    return this.findOne(encounterId);
  }

  async addActions(encounterId: string, actionCategoryIds: string[]) {
    const encounter = await this.prisma.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new NotFoundException('Rencontre non trouvee');

    await this.prisma.encounterAction.createMany({
      data: actionCategoryIds.map(actionCategoryId => ({
        encounterId,
        actionCategoryId,
      })),
      skipDuplicates: true,
    });

    return this.findOne(encounterId);
  }
}
