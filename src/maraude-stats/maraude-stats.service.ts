import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class MaraudeStatsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const [
      totalMaraudes,
      activeMaraudes,
      maraudesThisMonth,
      totalEncounters,
      encountersThisMonth,
      totalBeneficiaries,
      newBeneficiariesThisMonth,
      pendingReferrals,
      criticalEncounters,
    ] = await Promise.all([
      this.prisma.maraude.count(),
      this.prisma.maraude.count({ where: { status: 'IN_PROGRESS' } }),
      this.prisma.maraude.count({ where: { plannedStartAt: { gte: thirtyDaysAgo } } }),
      this.prisma.encounter.count(),
      this.prisma.encounter.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.prisma.beneficiary.count({ where: { deletedAt: null } }),
      this.prisma.beneficiary.count({ where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null } }),
      this.prisma.referral.count({ where: { status: 'PROPOSED' } }),
      this.prisma.encounter.count({ where: { urgencyLevel: 'CRITICAL', createdAt: { gte: sevenDaysAgo } } }),
    ]);

    return {
      data: {
        totalMaraudes,
        activeMaraudes,
        maraudesThisMonth,
        totalEncounters,
        encountersThisMonth,
        totalBeneficiaries,
        newBeneficiariesThisMonth,
        pendingReferrals,
        criticalEncounters,
      },
    };
  }

  async getActivity(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const maraudes = await this.prisma.maraude.findMany({
      where: {
        plannedStartAt: { gte: start, lte: end },
      },
      include: {
        _count: { select: { encounters: true, participants: true } },
        zone: { select: { name: true } },
      },
      orderBy: { plannedStartAt: 'desc' },
    });

    const encountersByType = await this.prisma.encounter.groupBy({
      by: ['type'],
      where: { createdAt: { gte: start, lte: end } },
      _count: true,
    });

    return {
      data: {
        maraudes,
        encountersByType: encountersByType.map((e: any) => ({ type: e.type, count: e._count })),
        period: { start, end },
      },
    };
  }

  async getNeeds(startDate?: string, endDate?: string) {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const needsDistribution = await this.prisma.encounterNeed.groupBy({
      by: ['needCategoryId'],
      where: { createdAt: { gte: start, lte: end } },
      _count: true,
      orderBy: { _count: { needCategoryId: 'desc' } },
    });

    // Resolve category names
    const categoryIds = needsDistribution.map((n: any) => n.needCategoryId);
    const categories = await this.prisma.needCategory.findMany({
      where: { id: { in: categoryIds } },
    });
    const catMap = new Map(categories.map((c: any) => [c.id, c]));

    const actionsDistribution = await this.prisma.encounterAction.groupBy({
      by: ['actionCategoryId'],
      where: { createdAt: { gte: start, lte: end } },
      _count: true,
      orderBy: { _count: { actionCategoryId: 'desc' } },
    });

    const actionIds = actionsDistribution.map((a: any) => a.actionCategoryId);
    const actionCats = await this.prisma.actionCategory.findMany({
      where: { id: { in: actionIds } },
    });
    const actMap = new Map(actionCats.map((c: any) => [c.id, c]));

    return {
      data: {
        needs: needsDistribution.map((n: any) => ({
          category: catMap.get(n.needCategoryId),
          count: n._count,
        })),
        actions: actionsDistribution.map((a: any) => ({
          category: actMap.get(a.actionCategoryId),
          count: a._count,
        })),
        period: { start, end },
      },
    };
  }

  async getTerritory() {
    // Encounters with location data for heatmap
    const encounters = await this.prisma.encounter.findMany({
      where: {
        locationLat: { not: null },
        locationLng: { not: null },
      },
      select: {
        id: true,
        locationLat: true,
        locationLng: true,
        urgencyLevel: true,
        type: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 1000,
    });

    const zones = await this.prisma.maraudeZone.findMany({
      where: { isActive: true },
      include: {
        _count: { select: { maraudes: true } },
      },
    });

    return { data: { encounters, zones } };
  }

  async getExport(startDate?: string, endDate?: string, format = 'json') {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    const maraudes = await this.prisma.maraude.findMany({
      where: { plannedStartAt: { gte: start, lte: end } },
      include: {
        zone: { select: { name: true } },
        _count: { select: { encounters: true, participants: true } },
        report: true,
      },
      orderBy: { plannedStartAt: 'asc' },
    });

    const encounterStats = await this.prisma.encounter.groupBy({
      by: ['type'],
      where: { createdAt: { gte: start, lte: end } },
      _count: true,
    });

    const beneficiaryStats = {
      total: await this.prisma.beneficiary.count({ where: { deletedAt: null } }),
      new: await this.prisma.beneficiary.count({ where: { createdAt: { gte: start, lte: end }, deletedAt: null } }),
    };

    const referralStats = await this.prisma.referral.groupBy({
      by: ['status'],
      where: { createdAt: { gte: start, lte: end } },
      _count: true,
    });

    return {
      data: {
        period: { start, end },
        maraudes: { total: maraudes.length, details: maraudes },
        encounters: encounterStats.map(e => ({ type: e.type, count: e._count })),
        beneficiaries: beneficiaryStats,
        referrals: referralStats.map(r => ({ status: r.status, count: r._count })),
      },
    };
  }
}
