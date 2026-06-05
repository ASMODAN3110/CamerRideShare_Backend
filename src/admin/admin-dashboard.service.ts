import { Injectable } from '@nestjs/common';
import {
  MotoStatus,
  PaymentStatus,
  PaymentType,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  currentPeriod,
  deltaPct,
  endOfWeek,
  previousPeriod,
  startOfMonth,
  startOfWeek,
} from '../common/utils/dashboard.utils';

@Injectable()
export class AdminDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const weekStart = startOfWeek(now);
    const weekEnd = endOfWeek(now);

    const [
      fleetTotal,
      fleetByStatus,
      activeInvestorRows,
      monthlyRevenueAgg,
      weeklyCollectedAgg,
      weeklyTargetAgg,
    ] = await Promise.all([
      this.prisma.moto.count(),
      this.prisma.moto.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
      this.prisma.investment.findMany({
        where: { closedAt: null },
        distinct: ['investorId'],
        select: { investorId: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          type: PaymentType.PAYMENT,
          status: PaymentStatus.VERIFIED,
          createdAt: { gte: monthStart },
        },
        _sum: { amount: true },
      }),
      this.prisma.payment.aggregate({
        where: {
          type: PaymentType.PAYMENT,
          status: PaymentStatus.VERIFIED,
          createdAt: { gte: weekStart, lte: weekEnd },
        },
        _sum: { amount: true },
      }),
      this.prisma.moto.aggregate({
        where: { status: MotoStatus.ACTIVE },
        _sum: { targetAmount: true },
      }),
    ]);

    const fleetStatus = {
      active: 0,
      stolen: 0,
      broken: 0,
    };

    for (const row of fleetByStatus) {
      if (row.status === MotoStatus.ACTIVE) {
        fleetStatus.active = row._count._all;
      } else if (row.status === MotoStatus.STOLEN) {
        fleetStatus.stolen = row._count._all;
      } else if (row.status === MotoStatus.BROKEN) {
        fleetStatus.broken = row._count._all;
      }
    }

    const activeInvestorsCount = activeInvestorRows.length;
    const monthlyRevenueAmount = monthlyRevenueAgg._sum.amount ?? 0;
    const weeklyCollected = weeklyCollectedAgg._sum.amount ?? 0;
    const weeklyTarget = Math.round((weeklyTargetAgg._sum.targetAmount ?? 0) / 4);

    const period = currentPeriod(now);
    const prevPeriod = previousPeriod(now);

    const previousSnapshot = await this.prisma.dashboardSnapshot.findUnique({
      where: { period: prevPeriod },
    });

    await this.prisma.dashboardSnapshot.upsert({
      where: { period },
      create: {
        period,
        fleetTotal,
        activeInvestors: activeInvestorsCount,
        monthlyRevenue: monthlyRevenueAmount,
      },
      update: {
        fleetTotal,
        activeInvestors: activeInvestorsCount,
        monthlyRevenue: monthlyRevenueAmount,
      },
    });

    return {
      fleet: {
        total: fleetTotal,
        deltaPct: deltaPct(fleetTotal, previousSnapshot?.fleetTotal ?? 0),
      },
      activeInvestors: {
        count: activeInvestorsCount,
        deltaPct: deltaPct(
          activeInvestorsCount,
          previousSnapshot?.activeInvestors ?? 0,
        ),
      },
      monthlyRevenue: {
        amount: monthlyRevenueAmount,
        currency: 'XAF',
        deltaPct: deltaPct(
          monthlyRevenueAmount,
          previousSnapshot?.monthlyRevenue ?? 0,
        ),
      },
      fleetStatus: {
        active: fleetStatus.active,
        stolen: fleetStatus.stolen,
        broken: fleetStatus.broken,
      },
      treasuryWeekly: {
        collected: weeklyCollected,
        target: weeklyTarget,
        periodStart: weekStart.toISOString().slice(0, 10),
        periodEnd: weekEnd.toISOString().slice(0, 10),
      },
    };
  }
}
