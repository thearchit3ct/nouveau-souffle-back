import { PrismaClient } from '../generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter } as any);

async function main() {
  // Seed membership types
  await prisma.membershipType.createMany({
    data: [
      {
        code: 'IND',
        name: 'Individuelle',
        description: 'Adhesion individuelle standard',
        price: 50.0,
        durationMonths: 12,
        maxUsers: 1,
        benefits: JSON.stringify([
          'Acces espace membre',
          'Vote AG',
          'Newsletter exclusive',
        ]),
        displayOrder: 1,
      },
      {
        code: 'COUPLE',
        name: 'Couple',
        description: 'Adhesion couple/famille',
        price: 80.0,
        durationMonths: 12,
        maxUsers: 2,
        benefits: JSON.stringify([
          '2 acces espace membre',
          '2 votes AG',
          'Newsletter exclusive',
        ]),
        displayOrder: 2,
      },
      {
        code: 'SOUTIEN',
        name: 'Soutien',
        description: 'Adhesion de soutien',
        price: 150.0,
        durationMonths: 12,
        maxUsers: 1,
        benefits: JSON.stringify([
          'Avantages Individuelle',
          'Reconnaissance publique',
          'Badge Soutien',
        ]),
        displayOrder: 3,
      },
      {
        code: 'BIENFAITEUR',
        name: 'Bienfaiteur',
        description: 'Adhesion bienfaiteur',
        price: 500.0,
        durationMonths: 12,
        maxUsers: 1,
        benefits: JSON.stringify([
          'Tous avantages',
          'Evenements VIP',
          'Rencontre annuelle bureau',
        ]),
        displayOrder: 4,
      },
      {
        code: 'HONNEUR',
        name: "Membre d'Honneur",
        description: 'Adhesion honoraire',
        price: 0.0,
        durationMonths: 12,
        maxUsers: 1,
        benefits: JSON.stringify(['Droits Bienfaiteur', 'A vie']),
        displayOrder: 5,
      },
    ],
    skipDuplicates: true,
  });

  // Seed admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@ns.thearchit3ct.xyz' },
    update: {},
    create: {
      email: 'admin@ns.thearchit3ct.xyz',
      firstName: 'Admin',
      lastName: 'NSM',
      status: 'ACTIVE',
      role: 'SUPER_ADMIN',
      emailVerified: true,
      isActive: true,
    },
  });

  // Seed test member user
  const member = await prisma.user.upsert({
    where: { email: 'membre@test.ns.thearchit3ct.xyz' },
    update: {},
    create: {
      email: 'membre@test.ns.thearchit3ct.xyz',
      firstName: 'Jean',
      lastName: 'Dupont',
      status: 'ACTIVE',
      role: 'MEMBER',
      emailVerified: true,
      isActive: true,
    },
  });

  // Seed test donor user
  const donor = await prisma.user.upsert({
    where: { email: 'donateur@test.ns.thearchit3ct.xyz' },
    update: {},
    create: {
      email: 'donateur@test.ns.thearchit3ct.xyz',
      firstName: 'Marie',
      lastName: 'Martin',
      status: 'ACTIVE',
      role: 'DONOR',
      emailVerified: true,
      isActive: true,
    },
  });

  // Seed projects
  await prisma.project.createMany({
    data: [
      {
        name: 'Mission Togo 2026',
        slug: 'mission-togo-2026',
        description:
          "Construction d'une ecole dans la region de Kara",
        targetAmount: 25000,
        status: 'ACTIVE',
        isFeatured: true,
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-08-31'),
      },
      {
        name: 'Aide Humanitaire Madagascar',
        slug: 'aide-humanitaire-madagascar',
        description:
          'Soutien aux populations touchees par le cyclone',
        targetAmount: 15000,
        status: 'ACTIVE',
        isFeatured: true,
        startDate: new Date('2026-01-15'),
      },
      {
        name: 'Programme Parrainage Enfants',
        slug: 'programme-parrainage-enfants',
        description:
          'Parrainage scolaire pour enfants defavorises',
        targetAmount: 50000,
        status: 'DRAFT',
        isFeatured: false,
      },
    ],
    skipDuplicates: true,
  });

  // Seed blog categories
  await prisma.category.createMany({
    data: [
      {
        name: 'Actualites',
        slug: 'actualites',
        color: '#3B82F6',
        displayOrder: 1,
      },
      {
        name: 'Temoignages',
        slug: 'temoignages',
        color: '#10B981',
        displayOrder: 2,
      },
    ],
    skipDuplicates: true,
  });

  // Seed memberships (need membership type IDs)
  const indType = await prisma.membershipType.findUnique({ where: { code: 'IND' } });
  const coupleType = await prisma.membershipType.findUnique({ where: { code: 'COUPLE' } });

  if (indType) {
    const now = new Date();
    const oneYearLater = new Date(now);
    oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
    const sixMonthsAgo = new Date(now);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Active membership for member
    const existingActive = await prisma.membership.findFirst({
      where: { userId: member.id, status: 'ACTIVE' },
    });
    if (!existingActive) {
      await prisma.membership.create({
        data: {
          userId: member.id,
          membershipTypeId: indType.id,
          status: 'ACTIVE',
          amountPaid: 50.0,
          memberNumber: 'NSM-2026-00001',
          startDate: sixMonthsAgo,
          endDate: oneYearLater,
          approvedAt: sixMonthsAgo,
          approvedById: admin.id,
        },
      });
    }

    // Pending membership for donor
    if (coupleType) {
      const existingPending = await prisma.membership.findFirst({
        where: { userId: donor.id, status: 'PENDING' },
      });
      if (!existingPending) {
        await prisma.membership.create({
          data: {
            userId: donor.id,
            membershipTypeId: coupleType.id,
            status: 'PENDING',
            amountPaid: 80.0,
            startDate: now,
            endDate: oneYearLater,
          },
        });
      }
    }
  }

  // Seed donations
  const projects = await prisma.project.findMany({ where: { status: 'ACTIVE' }, take: 2 });

  const existingDonations = await prisma.donation.count({ where: { userId: member.id } });
  if (existingDonations === 0) {
    await prisma.donation.createMany({
      data: [
        {
          userId: member.id,
          amount: 100,
          type: 'ONE_TIME',
          status: 'COMPLETED',
          paidAt: new Date('2026-01-15'),
          projectId: projects[0]?.id ?? null,
        },
        {
          userId: donor.id,
          amount: 50,
          type: 'ONE_TIME',
          status: 'COMPLETED',
          paidAt: new Date('2026-02-01'),
          projectId: projects[0]?.id ?? null,
        },
        {
          userId: donor.id,
          amount: 25,
          type: 'ONE_TIME',
          status: 'PENDING',
          projectId: projects[1]?.id ?? null,
        },
      ],
    });
  }

  // Seed events
  const existingEvents = await prisma.event.count();
  if (existingEvents === 0) {
    await prisma.event.createMany({
      data: [
        {
          createdById: admin.id,
          title: 'Assemblee Generale 2026',
          slug: 'assemblee-generale-2026',
          description: 'AG annuelle de l\'association',
          type: 'AG',
          status: 'PUBLISHED',
          visibility: 'MEMBERS',
          startDatetime: new Date('2026-03-15T14:00:00Z'),
          endDatetime: new Date('2026-03-15T18:00:00Z'),
          locationName: 'Salle Polyvalente',
          locationAddress: '12 rue de la Paix, 75002 Paris',
          capacity: 100,
          isFree: true,
          publishedAt: new Date(),
        },
        {
          createdById: admin.id,
          title: 'Gala de Charite 2026',
          slug: 'gala-de-charite-2026',
          description: 'Soiree de gala pour collecter des fonds',
          type: 'COLLECTE',
          status: 'PUBLISHED',
          visibility: 'PUBLIC',
          startDatetime: new Date('2026-04-20T19:00:00Z'),
          endDatetime: new Date('2026-04-20T23:00:00Z'),
          locationName: 'Hotel Ritz',
          locationAddress: '15 Place Vendome, 75001 Paris',
          capacity: 200,
          price: 50,
          isFree: false,
          publishedAt: new Date(),
        },
      ],
    });
  }

  // Seed notifications
  const existingNotifs = await prisma.notification.count({ where: { userId: member.id } });
  if (existingNotifs === 0) {
    await prisma.notification.createMany({
      data: [
        {
          userId: member.id,
          type: 'WELCOME',
          title: 'Bienvenue chez Nouveau Souffle',
          message: 'Votre compte a ete cree avec succes.',
          isRead: true,
          readAt: new Date(),
        },
        {
          userId: member.id,
          type: 'MEMBERSHIP_VALIDATED',
          title: 'Adhesion validee',
          message: 'Votre adhesion individuelle a ete validee.',
          actionUrl: '/espace-membre/adhesion',
        },
        {
          userId: donor.id,
          type: 'DONATION_VALIDATED',
          title: 'Don confirme',
          message: 'Votre don de 50 EUR a ete confirme.',
          actionUrl: '/espace-membre/dons',
        },
      ],
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
