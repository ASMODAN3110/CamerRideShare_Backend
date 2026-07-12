import { Injectable } from '@nestjs/common';
import { PaymentStatus, PaymentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  endOfMonth,
  startOfMonth,
} from '../common/utils/dashboard.utils';
import { FRENCH_MONTH_LABELS } from './investors-metrics.util';
import { InvestorsMetricsService } from './investors-metrics.service';
import { RoiTrendQueryDto } from './dto/roi-trend-query.dto';

@Injectable()
export class InvestorsRoiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: InvestorsMetricsService,
  ) {}

  async getTrend(query: RoiTrendQueryDto) {
    const [globalStats, driverIds] = await Promise.all([
      this.metricsService.getGlobalMotoStats(),
      this.metricsService.getFinancedDriverIds(),
    ]);

    const totalCapitalInvested = globalStats.totalCapitalInvested;
    const now = new Date();
    const points: { period: string; label: string; avgRoiPct: number }[] = [];

    for (let offset = query.months - 1; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      const monthStart = startOfMonth(date);
      const monthEnd = endOfMonth(date);

      let monthlyRecovered = 0;
      if (driverIds.length > 0) {
        const agg = await this.prisma.payment.aggregate({
          where: {
            driverId: { in: driverIds },
            type: PaymentType.PAYMENT,
            status: PaymentStatus.VERIFIED,
            createdAt: { gte: monthStart, lte: monthEnd },
          },
          _sum: { amount: true },
        });
        monthlyRecovered = agg._sum.amount ?? 0;
      }

      const avgRoiPct =
        totalCapitalInvested > 0
          ? Math.round((monthlyRecovered / totalCapitalInvested) * 100)
          : 0;

      points.push({
        period: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: FRENCH_MONTH_LABELS[date.getMonth()],
        avgRoiPct,
      });
    }

    return { points };
  }
}
