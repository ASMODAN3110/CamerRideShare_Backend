import {
  IncidentStatus,
  MotoStatus,
  PaymentStatus,
  PaymentType,
  PrismaClient,
  UserRole,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ── Helpers ──────────────────────────────────────────────────

const DEFAULT_WEEKLY = 15000;
const OVERDUE_DAYS = 21;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(8, 0, 0, 0);
  return d;
}

function monthsAgo(months: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(Math.min(15, d.getDate()));
  d.setHours(12, 0, 0, 0);
  return d;
}

function previousPeriod(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  // ── Nettoyage ─────────────────────────────────────────────
  await prisma.payment.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.driverSettings.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.moto.deleteMany();
  await prisma.user.deleteMany();

  // ═══════════════════════════════════════════════════════════
  // 1. USERS
  // ═══════════════════════════════════════════════════════════

  // ── Admin ─────────────────────────────────────────────────
  await prisma.user.create({
    data: {
      email: 'abdoulrahimmomo@gmail.com',
      phoneNumber: '692100263',
      fullName: 'Admin CamerRideShare',
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  // ── Investisseurs ─────────────────────────────────────────
  const investor1 = await prisma.user.create({
    data: {
      email: 'robert.martin@example.com',
      phoneNumber: '690000002',
      fullName: 'Robert Martin',
      role: UserRole.INVESTOR,
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=investor1',
    },
  });

  const investor2 = await prisma.user.create({
    data: {
      email: 'marie.kamga@example.com',
      phoneNumber: '690000003',
      fullName: 'Marie Kamga',
      role: UserRole.INVESTOR,
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=investor2',
    },
  });

  const investor3 = await prisma.user.create({
    data: {
      email: 'jean-pierre.nkoulou@example.com',
      phoneNumber: '690000004',
      fullName: 'Jean-Pierre Nkoulou',
      role: UserRole.INVESTOR,
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=investor3',
    },
  });

  // Investisseur inactif (0 moto financée)
  await prisma.user.create({
    data: {
      email: 'elise.tchinda@example.com',
      phoneNumber: '690000005',
      fullName: 'Élise Tchinda',
      role: UserRole.INVESTOR,
      passwordHash,
    },
  });

  // ── Conducteurs ───────────────────────────────────────────
  const driver1 = await prisma.user.create({
    data: {
      email: 'jean.nguele@example.com',
      phoneNumber: '690000011',
      fullName: 'Jean Nguélé',
      role: UserRole.DRIVER,
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=driver1',
    },
  });

  const driver2 = await prisma.user.create({
    data: {
      email: 'paul.biyong@example.com',
      phoneNumber: '690000012',
      fullName: 'Paul Biyong',
      role: UserRole.DRIVER,
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=driver2',
    },
  });

  const driver3 = await prisma.user.create({
    data: {
      email: 'marc.tchinda@example.com',
      phoneNumber: '690000013',
      fullName: 'Marc Tchinda',
      role: UserRole.DRIVER,
      passwordHash,
    },
  });

  const driver4 = await prisma.user.create({
    data: {
      email: 'sylvain.esso@example.com',
      phoneNumber: '690000014',
      fullName: 'Sylvain Essomba',
      role: UserRole.DRIVER,
      passwordHash,
      avatarUrl: 'https://i.pravatar.cc/150?u=driver4',
    },
  });

  const driver5 = await prisma.user.create({
    data: {
      email: 'pierre.mbarga@example.com',
      phoneNumber: '690000015',
      fullName: 'Pierre Mbarga',
      role: UserRole.DRIVER,
      passwordHash,
    },
  });

  // Conducteur SANS moto (pour tester les cas vides)
  await prisma.user.create({
    data: {
      email: 'jacques.ngono@example.com',
      phoneNumber: '690000016',
      fullName: 'Jacques Ngono',
      role: UserRole.DRIVER,
      passwordHash,
    },
  });

  const drivers = [driver1, driver2, driver3, driver4, driver5];

  console.log('✅ Utilisateurs créés');

  // ═══════════════════════════════════════════════════════════
  // 2. MOTOS
  // ═══════════════════════════════════════════════════════════

  const motoDefs: {
    mat: string;
    model: string;
    city: string;
    driver: typeof driver1 | null;
    investor: typeof investor1 | null;
    target: number;
    status: MotoStatus;
  }[] = [
    {
      mat: 'LT 1001 A',
      model: '125cc',
      city: 'Douala',
      driver: driver1,
      investor: investor1,
      target: 4500000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1002 A',
      model: '150cc',
      city: 'Douala',
      driver: driver1,
      investor: investor1,
      target: 5000000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1003 A',
      model: '125cc',
      city: 'Douala',
      driver: driver2,
      investor: investor1,
      target: 4500000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1004 A',
      model: '200cc',
      city: 'Yaoundé',
      driver: driver2,
      investor: investor1,
      target: 5500000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1005 A',
      model: '125cc',
      city: 'Yaoundé',
      driver: driver3,
      investor: investor2,
      target: 4500000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1006 A',
      model: '150cc',
      city: 'Yaoundé',
      driver: driver3,
      investor: investor2,
      target: 5000000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1007 A',
      model: '125cc',
      city: 'Bafoussam',
      driver: driver4,
      investor: investor2,
      target: 4000000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1008 A',
      model: '200cc',
      city: 'Bafoussam',
      driver: driver4,
      investor: investor2,
      target: 5500000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1009 A',
      model: '125cc',
      city: 'Douala',
      driver: driver5,
      investor: investor3,
      target: 4500000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1010 A',
      model: '150cc',
      city: 'Douala',
      driver: driver5,
      investor: investor3,
      target: 5000000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1011 A',
      model: '125cc',
      city: 'Garoua',
      driver: driver1,
      investor: investor3,
      target: 4000000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1012 A',
      model: '150cc',
      city: 'Garoua',
      driver: driver3,
      investor: investor3,
      target: 5000000,
      status: MotoStatus.BROKEN,
    },
    {
      mat: 'LT 1013 A',
      model: '125cc',
      city: 'Bamenda',
      driver: driver4,
      investor: investor1,
      target: 4500000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1014 A',
      model: '200cc',
      city: 'Bamenda',
      driver: driver5,
      investor: investor2,
      target: 5500000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1015 A',
      model: '150cc',
      city: 'Douala',
      driver: driver2,
      investor: investor3,
      target: 5000000,
      status: MotoStatus.STOLEN,
    },
    {
      mat: 'LT 1016 A',
      model: '125cc',
      city: 'Yaoundé',
      driver: null,
      investor: investor1,
      target: 4500000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1017 A',
      model: '150cc',
      city: 'Douala',
      driver: null,
      investor: investor2,
      target: 5000000,
      status: MotoStatus.ACTIVE,
    },
    {
      mat: 'LT 1018 A',
      model: '200cc',
      city: 'Douala',
      driver: null,
      investor: null,
      target: 5500000,
      status: MotoStatus.ACTIVE,
    },
  ];

  const recoveryRatios: Record<number, number> = {
    [investor1.id]: 0.84,
    [investor2.id]: 0.76,
    [investor3.id]: 0.68,
  };

  const motos = await Promise.all(
    motoDefs.map((def, i) =>
      prisma.moto.create({
        data: {
          matricule: def.mat,
          model: def.model,
          city: def.city,
          status: def.status,
          targetAmount: def.target,
          financedAmount: def.investor
            ? Math.round(
                def.target *
                  (recoveryRatios[def.investor.id] ?? 0.7) *
                  (0.95 + (i % 5) * 0.01),
              )
            : 0,
          driverId: def.driver?.id ?? null,
          investorId: def.investor?.id ?? null,
          lastMaintenanceAt: i % 4 === 0 ? daysAgo(20 + i * 5) : null,
          imageUrl:
            i % 3 === 0 ? `https://picsum.photos/seed/moto${i}/400/300` : null,
        },
      }),
    ),
  );

  console.log(`✅ ${motos.length} motos créées`);

  // ═══════════════════════════════════════════════════════════
  // 3. INVESTMENTS
  // ═══════════════════════════════════════════════════════════

  // Seulement les motos qui ont un investisseur
  for (const moto of motos) {
    if (moto.investorId) {
      await prisma.investment.create({
        data: {
          investorId: moto.investorId,
          motoId: moto.id,
          amount: moto.targetAmount,
          closedAt: null,
        },
      });
    }
  }

  console.log('✅ Investments créés');

  // ═══════════════════════════════════════════════════════════
  // 4. PAIEMENTS
  // ═══════════════════════════════════════════════════════════

  // 4a. Historique — 8 mois de paiements pour chaque conducteur avec moto
  const payingDrivers = drivers; // les 5 conducteurs avec moto
  for (let month = 0; month < 8; month += 1) {
    for (const driver of payingDrivers) {
      await prisma.payment.create({
        data: {
          driverId: driver.id,
          amount: DEFAULT_WEEKLY,
          type: PaymentType.PAYMENT,
          status: PaymentStatus.VERIFIED,
          createdAt: monthsAgo(7 - month),
        },
      });
    }
  }

  // 4b. Paiements récents du mois en cours (pour le dashboard)
  for (const driver of payingDrivers) {
    // Paiement il y a 2 semaines
    await prisma.payment.create({
      data: {
        driverId: driver.id,
        amount: DEFAULT_WEEKLY,
        type: PaymentType.PAYMENT,
        status: PaymentStatus.VERIFIED,
        createdAt: daysAgo(14),
      },
    });
    // Paiement récent
    await prisma.payment.create({
      data: {
        driverId: driver.id,
        amount: DEFAULT_WEEKLY,
        type: PaymentType.PAYMENT,
        status: PaymentStatus.VERIFIED,
        createdAt: daysAgo(2),
      },
    });
  }

  // 4c. Conducteur en retard (dernier paiement > 21 jours)
  await prisma.payment.create({
    data: {
      driverId: driver3.id,
      amount: DEFAULT_WEEKLY,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.VERIFIED,
      createdAt: daysAgo(OVERDUE_DAYS + 5), // seul paiement -> en retard
    },
  });

  // 4d. Dépenses (EXPENSE) pour certains conducteurs
  await prisma.payment.create({
    data: {
      driverId: driver1.id,
      amount: 25000,
      type: PaymentType.EXPENSE,
      status: PaymentStatus.VERIFIED,
      createdAt: daysAgo(10),
    },
  });
  await prisma.payment.create({
    data: {
      driverId: driver2.id,
      amount: 15000,
      type: PaymentType.EXPENSE,
      status: PaymentStatus.PENDING,
      createdAt: daysAgo(5),
    },
  });

  // 4e. Paiements en attente (PENDING)
  await prisma.payment.create({
    data: {
      driverId: driver1.id,
      amount: DEFAULT_WEEKLY,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.PENDING,
      createdAt: daysAgo(1),
    },
  });
  await prisma.payment.create({
    data: {
      driverId: driver4.id,
      amount: DEFAULT_WEEKLY,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.PENDING,
      createdAt: daysAgo(3),
    },
  });
  await prisma.payment.create({
    data: {
      driverId: driver4.id,
      amount: DEFAULT_WEEKLY,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.PENDING,
      createdAt: daysAgo(1),
    },
  });

  console.log('✅ Paiements créés');

  // ═══════════════════════════════════════════════════════════
  // 5. INCIDENTS
  // ═══════════════════════════════════════════════════════════

  // 5a. Incidents ouverts sur des motos (pour le fleet summary)
  const activeMotos = motos.filter((m) => m.status === MotoStatus.ACTIVE);
  for (let i = 0; i < 3 && i < activeMotos.length; i += 1) {
    const moto = activeMotos[i];
    await prisma.incident.create({
      data: {
        driverId: moto.driverId ?? drivers[i].id,
        motoId: moto.id,
        type: i === 0 ? 'ACCIDENT' : i === 1 ? 'BREAKDOWN' : 'THEFT_ATTEMPT',
        description:
          i === 0
            ? 'Collision légère — aile avant endommagée'
            : i === 1
              ? 'Problème de freins signalé'
              : 'Tentative de vol — antidémarrage endommagé',
        status: IncidentStatus.OPEN,
        createdAt: daysAgo(3 + i * 2),
      },
    });
  }

  // 5b. Incident résolu
  await prisma.incident.create({
    data: {
      driverId: driver2.id,
      motoId: motos[2].id,
      type: 'BREAKDOWN',
      description: 'Panne moteur — réparé sous garantie',
      status: IncidentStatus.RESOLVED,
      createdAt: daysAgo(45),
      updatedAt: daysAgo(30),
    },
  });

  // 5c. Incident sans moto (test)
  await prisma.incident.create({
    data: {
      driverId: driver4.id,
      type: 'ACCIDENT',
      description: 'Chute sans dommage moto',
      status: IncidentStatus.OPEN,
      createdAt: daysAgo(7),
    },
  });

  console.log('✅ Incidents créés');

  // ═══════════════════════════════════════════════════════════
  // 6. DASHBOARD SNAPSHOT (mois précédent)
  // ═══════════════════════════════════════════════════════════

  await prisma.dashboardSnapshot.create({
    data: {
      period: previousPeriod(),
      fleetTotal: motos.length,
      activeInvestors: 3,
      monthlyRevenue: payingDrivers.length * DEFAULT_WEEKLY * 4,
    },
  });

  console.log('✅ Snapshot mensuel créé');

  // ═══════════════════════════════════════════════════════════
  // RÉCAPITULATIF
  // ═══════════════════════════════════════════════════════════

  const motoCounts = await prisma.moto.groupBy({
    by: ['status'],
    _count: { _all: true },
  });
  const pendingCount = await prisma.payment.count({
    where: { status: PaymentStatus.PENDING },
  });

  console.log('\n══════════════════════════════════════════════════');
  console.log('📊 RÉCAPITULATIF DU SEED');
  console.log('══════════════════════════════════════════════════');
  console.log('');
  console.log('👤 Comptes de test (mdp: password123)');
  console.log(`   ADMIN        → 692100263`);
  console.log(`   Investisseur → 690000002 (Robert Martin)`);
  console.log(`   Investisseur → 690000003 (Marie Kamga)`);
  console.log(`   Investisseur → 690000004 (J-P Nkoulou)`);
  console.log(`   Conducteur   → 690000011 (Jean Nguélé)`);
  console.log(`   Conducteur   → 690000012 (Paul Biyong)`);
  console.log(`   Conducteur   → 690000013 (Marc Tchinda) — EN RETARD`);
  console.log(`   Conducteur   → 690000014 (Sylvain Essomba)`);
  console.log(`   Conducteur   → 690000015 (Pierre Mbarga)`);
  console.log(`   Conducteur   → 690000016 (Jacques Ngono) — sans moto`);
  console.log('');
  for (const row of motoCounts) {
    console.log(`   🏍️  ${row.status}: ${row._count._all}`);
  }
  console.log(`   ⏳ Paiements en attente: ${pendingCount}`);
  console.log('');
  console.log('══════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
