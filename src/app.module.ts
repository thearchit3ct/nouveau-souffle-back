import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthModule } from './health/health.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { AuditModule } from './common/audit/audit.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { MembershipsModule } from './memberships/memberships.module.js';
import { DonationsModule } from './donations/donations.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { EventsModule } from './events/events.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ArticlesModule } from './articles/articles.module.js';
import { UploadModule } from './upload/upload.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    HealthModule,
    AuthModule.forRoot(),
    UsersModule,
    AuditModule,
    NotificationsModule,
    MembershipsModule,
    DonationsModule,
    ProjectsModule,
    EventsModule,
    CategoriesModule,
    ArticlesModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
