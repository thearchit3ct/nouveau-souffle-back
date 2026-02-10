import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import type { Request } from 'express';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(
    userId: string | null,
    action: string,
    entityType: string,
    entityId?: string,
    oldValues?: Record<string, unknown>,
    newValues?: Record<string, unknown>,
    req?: Request,
  ) {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action,
        entityType,
        entityId: entityId ?? null,
        oldValues: oldValues ? (oldValues as any) : undefined,
        newValues: newValues ? (newValues as any) : undefined,
        ipAddress: req?.ip ?? null,
        userAgent: req?.headers?.['user-agent'] ?? null,
      },
    });
  }
}
