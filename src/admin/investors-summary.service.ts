import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InvestorsMetricsService } from './investors-metrics.service';

@Injectable()
export class InvestorsSummaryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly metricsService: InvestorsMetricsService,
  ) {}

  async getSummary() {
    const [globalStats, metrics, totalInvestorsCount] = await Promise.all([
      this.metricsService.getGlobalMotoStats(),
      this.metricsService.buildInvestorMetrics(),
      this.prisma.user.count({ where: { role: UserRole.INVESTOR } }),
    ]);

    const activeInvestorsCount = metrics.filter(
      (row) => row.motosCount > 0,
    ).length;

    const topContributors = metrics
      .filter((row) => row.amountInvested > 0)
      .sort((a, b) => b.recoveryRatePct - a.recoveryRatePct)
      .slice(0, 4)
      .map((row) => ({
        id: row.id,
        fullName: row.fullName,
        avatarUrl: row.avatarUrl,
        recoveryRatePct: row.recoveryRatePct,
      }));

    return {
      totalCapitalInvested: globalStats.totalCapitalInvested,
      activeInvestorsCount,
      totalInvestorsCount,
      financedMotosCount: globalStats.financedMotosCount,
      currency: 'XAF',
      topContributors,
    };
  }
}
