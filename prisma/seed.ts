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

const CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Garoua', 'Bamenda'];
const MOTO_MODELS = ['TVS HLX', 'Bajaj Boxer', 'Honda Ace', 'Yamaha Crux'];

function previousPeriod(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function daysAgo(days: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
}

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.payment.deleteMany();
  await prisma.incident.deleteMany();
  await prisma.investment.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.dashboardSnapshot.deleteMany();
  await prisma.moto.deleteMany();
  await prisma.user.deleteMany();

  const admin = await prisma.user.create({
    data: {
      email: 'admin@camerrideshare.com',
      phoneNumber: '690000001',
      fullName: 'Admin CamerRideShare',
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  const investors = await Promise.all(
    [1, 2].map((i) =>
      prisma.user.create({
        data: {
          email: `investor${i}@example.com`,
          phoneNumber: `69000000${i + 1}`,
          fullName: `Investisseur ${i}`,
          role: UserRole.INVESTOR,
          passwordHash,
        },
      }),
    ),
  );

  const drivers = await Promise.all(
    [1, 2, 3, 4, 5].map((i) =>
      prisma.user.create({
        data: {
          email: `driver${i}@example.com`,
          phoneNumber: `69000001${i}`,
          fullName: `Chauffeur ${i} Nom${i}`,
          role: UserRole.DRIVER,
          passwordHash,
          avatarUrl: i % 2 === 0 ? `https://i.pravatar.cc/150?u=driver${i}` : null,
        },
      }),
    ),
  );

  const motoStatuses: MotoStatus[] = [];
  for (let i = 0; i < 110; i += 1) motoStatuses.push(MotoStatus.ACTIVE);
  for (let i = 0; i < 8; i += 1) motoStatuses.push(MotoStatus.STOLEN);
  for (let i = 0; i < 6; i += 1) motoStatuses.push(MotoStatus.BROKEN);

  const motos = [];
  for (let i = 0; i < motoStatuses.length; i += 1) {
    const driver = drivers[i % drivers.length];
    const investor = investors[i % investors.length];
    const moto = await prisma.moto.create({
      data: {
        model: MOTO_MODELS[i % MOTO_MODELS.length],
        city: CITIES[i % CITIES.length],
        status: motoStatuses[i],
        financedAmount: 800000 + (i % 5) * 50000,
        targetAmount: 60000,
        driverId: driver.id,
        investorId: investor.id,
      },
    });
    motos.push(moto);
  }

  for (let i = 0; i < 20; i += 1) {
    await prisma.investment.create({
      data: {
        investorId: investors[i % investors.length].id,
        motoId: motos[i].id,
        amount: 500000 + i * 10000,
        closedAt: i >= 18 ? daysAgo(30) : null,
      },
    });
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const driver of drivers) {
    await prisma.payment.create({
      data: {
        driverId: driver.id,
        amount: 15000 + Math.floor(Math.random() * 5000),
        type: PaymentType.PAYMENT,
        status: PaymentStatus.VERIFIED,
        createdAt: new Date(monthStart.getTime() + Math.random() * 7 * 86400000),
      },
    });

    await prisma.payment.create({
      data: {
        driverId: driver.id,
        amount: 15000,
        type: PaymentType.PAYMENT,
        status: PaymentStatus.VERIFIED,
        createdAt: daysAgo(2),
      },
    });
  }

  for (const driver of drivers.slice(0, 2)) {
    await prisma.payment.create({
      data: {
        driverId: driver.id,
        amount: 15000,
        type: PaymentType.PAYMENT,
        status: PaymentStatus.VERIFIED,
        createdAt: daysAgo(30),
      },
    });
  }

  await prisma.incident.createMany({
    data: [
      {
        driverId: drivers[0].id,
        motoId: motos[0].id,
        type: 'ACCIDENT',
        description: 'Collision légère à Douala',
        status: IncidentStatus.OPEN,
      },
      {
        driverId: drivers[1].id,
        motoId: motos[1].id,
        type: 'THEFT_ATTEMPT',
        description: 'Tentative de vol signalée',
        status: IncidentStatus.OPEN,
      },
      {
        driverId: drivers[2].id,
        type: 'BREAKDOWN',
        description: 'Panne moteur',
        status: IncidentStatus.RESOLVED,
      },
    ],
  });

  await prisma.dashboardSnapshot.create({
    data: {
      period: previousPeriod(),
      fleetTotal: 118,
      activeInvestors: 1,
      monthlyRevenue: 450000,
    },
  });

  console.log('Seed completed.');
  console.log(`Admin login: phone 690000001 / password123 (id=${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
