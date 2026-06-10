import { Injectable } from '@nestjs/common';
import { MotoStatus, PaymentStatus, PaymentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DEFAULT_WEEKLY_VERSEMENT,
  endOfMonth,
  startOfMonth,
  weeksInMonth,
} from '../common/utils/dashboard.utils';

@Injectable()
export class PaymentsSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const [monthlyCollectedAgg, activeMotosWithDriver, pendingCount] =
      await Promise.all([
        this.prisma.payment.aggregate({
          where: {
            type: PaymentType.PAYMENT,
            status: PaymentStatus.VERIFIED,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        }),
        this.prisma.moto.count({
          where: {
            status: MotoStatus.ACTIVE,
            driverId: { not: null },
          },
        }),
        this.prisma.payment.count({
          where: { status: PaymentStatus.PENDING },
        }),
      ]);

    const monthlyCollected = monthlyCollectedAgg._sum.amount ?? 0;
    const monthlyTarget =
      activeMotosWithDriver *
      DEFAULT_WEEKLY_VERSEMENT *
      weeksInMonth(now);
    const recoveryRatePct =
      monthlyTarget > 0
        ? Math.round((monthlyCollected / monthlyTarget) * 100)
        : 0;

    return {
      monthlyCollected,
      monthlyTarget,
      recoveryRatePct,
      pendingCount,
      currency: 'XAF',
      periodStart: monthStart.toISOString().slice(0, 10),
      periodEnd: monthEnd.toISOString().slice(0, 10),
    };
  }
}
