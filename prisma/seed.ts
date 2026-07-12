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
const MOTO_MODELS = ['125cc', '150cc', '200cc'];

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

function monthsAgo(months: number, day = 15): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  d.setDate(day);
  d.setHours(12, 0, 0, 0);
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
    [1, 2, 3, 4, 5].map((i) =>
      prisma.user.create({
        data: {
          email: `investor${i}@example.com`,
          phoneNumber: `6900000${i + 1}`,
          fullName:
            i === 1
              ? 'Robert Martin'
              : i === 2
                ? 'Marie Kamga'
                : `Investisseur ${i}`,
          role: UserRole.INVESTOR,
          passwordHash,
          avatarUrl:
            i % 2 === 0
              ? `https://i.pravatar.cc/150?u=investor${i}`
              : null,
        },
      }),
    ),
  );

  const activeInvestorIds = investors.slice(0, 3).map((inv) => inv.id);
  const recoveryRatios = [0.84, 0.76, 0.68];

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

  const TOTAL_MOTOS = 124;
  const BROKEN_COUNT = 7;
  const STOLEN_COUNT = 7;
  const ACTIVE_WITH_OPEN_INCIDENT = 5;

  const motoStatuses: MotoStatus[] = [];
  for (let i = 0; i < TOTAL_MOTOS - BROKEN_COUNT - STOLEN_COUNT; i += 1) {
    motoStatuses.push(MotoStatus.ACTIVE);
  }
  for (let i = 0; i < STOLEN_COUNT; i += 1) motoStatuses.push(MotoStatus.STOLEN);
  for (let i = 0; i < BROKEN_COUNT; i += 1) motoStatuses.push(MotoStatus.BROKEN);

  const motos = [];
  for (let i = 0; i < motoStatuses.length; i += 1) {
    const investorIndex = i % activeInvestorIds.length;
    const investorId = activeInvestorIds[investorIndex];
    const targetAmount = 5000000;
    const ratio = recoveryRatios[investorIndex];
    const financedAmount = Math.min(
      Math.round(targetAmount * ratio * (0.95 + (i % 5) * 0.01)),
      targetAmount,
    );
    const driver =
      investorIndex === 2 ? drivers[4] : drivers[i % (drivers.length - 1)];

    const moto = await prisma.moto.create({
      data: {
        matricule: `LT ${1000 + i} A`,
        model: MOTO_MODELS[i % MOTO_MODELS.length],
        city: CITIES[i % CITIES.length],
        status: motoStatuses[i],
        financedAmount,
        targetAmount,
        driverId: driver.id,
        investorId,
        lastMaintenanceAt: i % 3 === 0 ? daysAgo(10 + (i % 60)) : null,
        imageUrl:
          i % 5 === 0
            ? `https://picsum.photos/seed/moto${i}/400/300`
            : null,
      },
    });
    motos.push(moto);
  }

  for (let i = 0; i < 20; i += 1) {
    await prisma.investment.create({
      data: {
        investorId: investors[i % activeInvestorIds.length].id,
        motoId: motos[i].id,
        amount: 500000 + i * 10000,
        closedAt: i >= 18 ? daysAgo(30) : null,
      },
    });
  }

  const lateDriver = drivers[4];
  const payingDrivers = drivers.slice(0, 4);

  for (let month = 0; month < 8; month += 1) {
    for (const driver of payingDrivers) {
      await prisma.payment.create({
        data: {
          driverId: driver.id,
          amount: 12000 + month * 1500 + driver.id * 500,
          type: PaymentType.PAYMENT,
          status: PaymentStatus.VERIFIED,
          createdAt: monthsAgo(7 - month, 10 + driver.id),
        },
      });
    }
  }

  await prisma.payment.create({
    data: {
      driverId: lateDriver.id,
      amount: 15000,
      type: PaymentType.PAYMENT,
      status: PaymentStatus.VERIFIED,
      createdAt: daysAgo(45),
    },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  for (const driver of payingDrivers) {
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

  for (let i = 0; i < 12; i += 1) {
    const driver = payingDrivers[i % payingDrivers.length];
    await prisma.payment.create({
      data: {
        driverId: driver.id,
        amount: 10000 + (i % 4) * 2500,
        type: i % 3 === 0 ? PaymentType.EXPENSE : PaymentType.PAYMENT,
        status: PaymentStatus.VERIFIED,
        createdAt: daysAgo(5 + (i % 20)),
      },
    });
  }

  for (let i = 0; i < 13; i += 1) {
    const driver = payingDrivers[i % payingDrivers.length];
    await prisma.payment.create({
      data: {
        driverId: driver.id,
        amount: 12000 + (i % 5) * 3000,
        type: i % 4 === 0 ? PaymentType.EXPENSE : PaymentType.PAYMENT,
        status: PaymentStatus.PENDING,
        createdAt: daysAgo(i % 7),
      },
    });
  }

  const activeMotos = motos.filter((moto) => moto.status === MotoStatus.ACTIVE);
  const incidentMotos = activeMotos.slice(0, ACTIVE_WITH_OPEN_INCIDENT);

  await prisma.incident.createMany({
    data: [
      ...incidentMotos.map((moto, index) => ({
        driverId: moto.driverId!,
        motoId: moto.id,
        type: index % 2 === 0 ? 'ACCIDENT' : 'THEFT_ATTEMPT',
        description:
          index % 2 === 0
            ? 'Collision légère signalée'
            : 'Tentative de vol signalée',
        status: IncidentStatus.OPEN,
      })),
      {
        driverId: drivers[2].id,
        type: 'BREAKDOWN',
        description: 'Panne moteur (sans moto assignée)',
        status: IncidentStatus.RESOLVED,
      },
    ],
  });

  await prisma.dashboardSnapshot.create({
    data: {
      period: previousPeriod(),
      fleetTotal: TOTAL_MOTOS,
      activeInvestors: 1,
      monthlyRevenue: 450000,
    },
  });

  console.log('Seed completed.');
  console.log(`Admin login: phone 690000001 / password123 (id=${admin.id})`);
  console.log(`Investors: 5 total (3 with motos, 2 inactive)`);
  console.log(
    `Fleet KPI target: total=${TOTAL_MOTOS}, available=105, inMaintenance=${BROKEN_COUNT}, incidents=${STOLEN_COUNT + ACTIVE_WITH_OPEN_INCIDENT}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
