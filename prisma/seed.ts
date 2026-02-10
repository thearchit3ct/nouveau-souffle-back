import { PrismaClient } from '../generated/prisma/client.js';

const prisma = new PrismaClient({});

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
  await prisma.user.upsert({
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

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
