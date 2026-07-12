import { Injectable } from '@nestjs/common';
import {
  MotoStatus,
  PaymentStatus,
  PaymentType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatDriverName, OVERDUE_DAYS } from '../common/utils/dashboard.utils';
import {
  aggregateMotosByInvestor,
  InvestorStatus,
  MotoInvestorRow,
  recoveryRatePct,
  resolveInvestorStatus,
} from './investors-metrics.util';

export interface InvestorMetricRow {
  id: number;
  fullName: string;
  avatarUrl: string | null;
  createdAt: Date;
  amountInvested: number;
  amountRecovered: number;
  recoveryRatePct: number;
  motosCount: number;
  zone: string | null;
  status: InvestorStatus;
}

@Injectable()
export class InvestorsMetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async getGlobalMotoStats() {
    const agg = await this.prisma.moto.aggregate({
      where: { investorId: { not: null } },
      _sum: { targetAmount: true },
      _count: { _all: true },
    });

    return {
      totalCapitalInvested: agg._sum.targetAmount ?? 0,
      financedMotosCount: agg._count._all,
    };
  }

  async buildInvestorMetrics(): Promise<InvestorMetricRow[]> {
    const [investors, financedMotos, overdueDriverIds] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: UserRole.INVESTOR },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          fullName: true,
          avatarUrl: true,
          createdAt: true,
        },
      }),
      this.prisma.moto.findMany({
        where: { investorId: { not: null } },
        select: {
          investorId: true,
          targetAmount: true,
          financedAmount: true,
          city: true,
          status: true,
          driverId: true,
        },
      }),
      this.getOverdueDriverIds(),
    ]);

    const motoRows: MotoInvestorRow[] = financedMotos.map((moto) => ({
      investorId: moto.investorId!,
      targetAmount: moto.targetAmount,
      financedAmount: moto.financedAmount,
      city: moto.city,
      status: moto.status,
      driverId: moto.driverId,
    }));

    const aggregates = aggregateMotosByInvestor(motoRows, overdueDriverIds);

    return investors.map((investor) => {
      const agg = aggregates.get(investor.id) ?? {
        amountInvested: 0,
        amountRecovered: 0,
        motosCount: 0,
        zone: null,
        hasLateMoto: false,
      };

      return {
        id: investor.id,
        fullName: formatDriverName(investor.fullName),
        avatarUrl: investor.avatarUrl,
        createdAt: investor.createdAt,
        amountInvested: agg.amountInvested,
        amountRecovered: agg.amountRecovered,
        recoveryRatePct: recoveryRatePct(
          agg.amountInvested,
          agg.amountRecovered,
        ),
        motosCount: agg.motosCount,
        zone: agg.zone,
        status: resolveInvestorStatus(agg.motosCount, agg.hasLateMoto),
      };
    });
  }

  async getFinancedDriverIds(): Promise<number[]> {
    const motos = await this.prisma.moto.findMany({
      where: {
        investorId: { not: null },
        driverId: { not: null },
      },
      select: { driverId: true },
      distinct: ['driverId'],
    });

    return motos
      .map((moto) => moto.driverId)
      .filter((id): id is number => id !== null);
  }

  private async getOverdueDriverIds(): Promise<Set<number>> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - OVERDUE_DAYS);

    const activeFinancedMotos = await this.prisma.moto.findMany({
      where: {
        investorId: { not: null },
        status: MotoStatus.ACTIVE,
        driverId: { not: null },
      },
      select: { driverId: true },
      distinct: ['driverId'],
    });

    const driverIds = activeFinancedMotos
      .map((moto) => moto.driverId)
      .filter((id): id is number => id !== null);

    if (driverIds.length === 0) {
      return new Set();
    }

    const recentPayments = await this.prisma.payment.findMany({
      where: {
        driverId: { in: driverIds },
        status: PaymentStatus.VERIFIED,
        type: PaymentType.PAYMENT,
        createdAt: { gte: cutoff },
      },
      select: { driverId: true },
      distinct: ['driverId'],
    });

    const paidDriverIds = new Set(recentPayments.map((p) => p.driverId));
    return new Set(driverIds.filter((id) => !paidDriverIds.has(id)));
  }
}
