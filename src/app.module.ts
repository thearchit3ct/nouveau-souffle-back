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
import { PaymentsModule } from './payments/payments.module.js';
import { ContactModule } from './contact/contact.module.js';
import { EmailModule } from './email/email.module.js';
import { ReceiptsModule } from './receipts/receipts.module.js';
import { SearchModule } from './search/search.module.js';
import { RecurrencesModule } from './recurrences/recurrences.module.js';
import { VolunteersModule } from './volunteers/volunteers.module.js';
import { DocumentsModule } from './documents/documents.module.js';
import { TrainingsModule } from './trainings/trainings.module.js';
import { MaraudesModule } from './maraudes/maraudes.module.js';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module.js';
import { EncountersModule } from './encounters/encounters.module.js';
import { ReferralsModule } from './referrals/referrals.module.js';
import { ReferralStructuresModule } from './referral-structures/referral-structures.module.js';
import { MaraudeStatsModule } from './maraude-stats/maraude-stats.module.js';
import { MaraudeCategoriesModule } from './maraude-categories/maraude-categories.module.js';
import { ThrottlerModule } from '@nestjs/throttler';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }]),
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
    PaymentsModule,
    EmailModule,
    ReceiptsModule,
    ContactModule,
    SearchModule,
    RecurrencesModule,
    VolunteersModule,
    DocumentsModule,
    TrainingsModule,
    MaraudesModule,
    BeneficiariesModule,
    EncountersModule,
    ReferralsModule,
    ReferralStructuresModule,
    MaraudeStatsModule,
    MaraudeCategoriesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
