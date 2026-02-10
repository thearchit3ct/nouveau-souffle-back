import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ConfigService } from '@nestjs/config';

export interface ServiceHealth {
  status: 'ok' | 'error';
  responseTime?: number;
  error?: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async checkAll() {
    const [postgres, supertokens] = await Promise.allSettled([
      this.checkPostgres(),
      this.checkSuperTokens(),
    ]);

    const services: Record<string, ServiceHealth> = {
      postgres:
        postgres.status === 'fulfilled'
          ? postgres.value
          : { status: 'error', error: 'Check failed' },
      supertokens:
        supertokens.status === 'fulfilled'
          ? supertokens.value
          : { status: 'error', error: 'Check failed' },
    };

    const allHealthy = Object.values(services).every(
      (s) => s.status === 'ok',
    );

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '0.1.0',
      services,
    };
  }

  private async checkPostgres(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', responseTime: Date.now() - start };
    } catch (err: any) {
      this.logger.error('PostgreSQL health check failed', err.message);
      return {
        status: 'error',
        responseTime: Date.now() - start,
        error: 'Connection failed',
      };
    }
  }

  private async checkSuperTokens(): Promise<ServiceHealth> {
    const start = Date.now();
    const uri =
      this.config.get<string>('SUPERTOKENS_CONNECTION_URI') ||
      'http://localhost:3567';
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${uri}/hello`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        return { status: 'ok', responseTime: Date.now() - start };
      }
      return {
        status: 'error',
        responseTime: Date.now() - start,
        error: `HTTP ${res.status}`,
      };
    } catch (err: any) {
      this.logger.error('SuperTokens health check failed', err.message);
      return {
        status: 'error',
        responseTime: Date.now() - start,
        error: 'Connection failed',
      };
    }
  }
}
