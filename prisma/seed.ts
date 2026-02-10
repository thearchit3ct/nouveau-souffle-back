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

  // Seed articles
  const categories = await prisma.category.findMany();
  const actuCat = categories.find((c) => c.slug === 'actualites');
  const temoCat = categories.find((c) => c.slug === 'temoignages');

  const existingArticles = await prisma.article.count();
  if (existingArticles === 0) {
    const article1 = await prisma.article.create({
      data: {
        authorId: admin.id,
        title: 'Lancement de la Mission Togo 2026',
        slug: 'lancement-mission-togo-2026',
        excerpt:
          "Decouvrez notre nouveau projet phare : la construction d'une ecole dans la region de Kara au Togo, prevue pour mars 2026.",
        content: `# Lancement de la Mission Togo 2026

Nous sommes heureux de vous annoncer le lancement officiel de notre projet le plus ambitieux a ce jour : la **Mission Togo 2026**.

## Un projet d'envergure

Ce projet vise a construire une ecole primaire complete dans la region de Kara, au nord du Togo. Cette zone rurale manque cruellement d'infrastructures educatives, et de nombreux enfants doivent parcourir plus de 10 kilometres chaque jour pour se rendre en classe.

## Les objectifs

Notre objectif est de collecter **25 000 euros** pour financer :
- La construction de 6 salles de classe
- L'installation de sanitaires
- La mise en place d'un point d'eau potable
- L'achat de fournitures scolaires pour la premiere annee

## Comment participer ?

Vous pouvez nous soutenir de plusieurs manieres :
1. **Faire un don** directement sur notre plateforme
2. **Devenir membre** de l'association
3. **Partager** notre projet autour de vous
4. **Participer** a nos evenements de collecte

## Calendrier previsionnel

- **Mars 2026** : Debut des travaux
- **Juin 2026** : Fin du gros oeuvre
- **Aout 2026** : Inauguration et premiere rentree

Ensemble, donnons un nouveau souffle a l'education au Togo !`,
        status: 'PUBLISHED',
        publishedAt: new Date('2026-02-01'),
        viewCount: 42,
        commentsEnabled: true,
      },
    });

    const article2 = await prisma.article.create({
      data: {
        authorId: admin.id,
        title: "Temoignage : l'impact de notre aide a Madagascar",
        slug: 'temoignage-impact-aide-madagascar',
        excerpt:
          'Marie, beneficiaire de notre programme a Madagascar, nous raconte comment le soutien de Nouveau Souffle a change sa vie.',
        content: `# Temoignage : l'impact de notre aide a Madagascar

*Par Marie Razafindrakoto, beneficiaire du programme d'aide humanitaire*

## Une situation difficile

Quand le cyclone a frappe notre village en janvier dernier, nous avons tout perdu. Notre maison, nos recoltes, nos affaires. Nous nous sommes retrouves sans rien, avec trois enfants a nourrir.

## L'arrivee de l'aide

C'est alors que l'equipe de Nouveau Souffle en Mission est arrivee. Ils nous ont apporte de la nourriture, des vetements et des materiaux pour reconstruire notre abri. Mais surtout, ils nous ont donne de l'espoir.

## Reconstruction

Grace au programme de microfinance mis en place par l'association, j'ai pu relancer mon activite de couture. Aujourd'hui, je gagne suffisamment pour nourrir ma famille et envoyer mes enfants a l'ecole.

## Un message de gratitude

Je veux remercier tous les donateurs et benevoles de Nouveau Souffle. Votre generositas a change nos vies. Vous etes la preuve que la solidarite peut deplacer des montagnes.

*Merci du fond du coeur.*`,
        status: 'PUBLISHED',
        publishedAt: new Date('2026-01-20'),
        viewCount: 28,
        commentsEnabled: true,
      },
    });

    await prisma.article.create({
      data: {
        authorId: admin.id,
        title: 'Bilan annuel 2025 : une annee de croissance',
        slug: 'bilan-annuel-2025',
        excerpt:
          "Retour sur les realisations et les defis de l'annee 2025 pour Nouveau Souffle en Mission.",
        content: `# Bilan annuel 2025

Ce brouillon sera publie apres validation par le bureau de l'association.

## Chiffres cles
- 45 nouveaux membres
- 18 500 euros de dons collectes
- 3 projets menes a bien
- 12 evenements organises

## A suivre...`,
        status: 'DRAFT',
        viewCount: 0,
        commentsEnabled: false,
      },
    });

    // Link articles to categories
    if (actuCat) {
      await prisma.articleCategory.createMany({
        data: [
          { articleId: article1.id, categoryId: actuCat.id },
        ],
        skipDuplicates: true,
      });
    }
    if (temoCat) {
      await prisma.articleCategory.createMany({
        data: [
          { articleId: article2.id, categoryId: temoCat.id },
        ],
        skipDuplicates: true,
      });
    }
    if (actuCat && temoCat) {
      // Article 1 also in temoignages
      await prisma.articleCategory.createMany({
        data: [
          { articleId: article1.id, categoryId: temoCat.id },
        ],
        skipDuplicates: true,
      });
    }
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
