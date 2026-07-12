import { Injectable } from '@nestjs/common';
import { InvestorsMetricsService } from './investors-metrics.service';
import { ListInvestorsQueryDto } from './dto/list-investors-query.dto';

@Injectable()
export class InvestorsListService {
  constructor(private readonly metricsService: InvestorsMetricsService) {}

  async findPaginated(query: ListInvestorsQueryDto) {
    let rows = await this.metricsService.buildInvestorMetrics();

    if (query.search?.trim()) {
      const term = query.search.trim().toLowerCase();
      rows = rows.filter((row) =>
        row.fullName.toLowerCase().includes(term),
      );
    }

    if (query.status) {
      rows = rows.filter((row) => row.status === query.status);
    }

    rows.sort((a, b) => {
      const diff = a.createdAt.getTime() - b.createdAt.getTime();
      return query.sort === 'asc' ? diff : -diff;
    });

    const total = rows.length;
    const skip = (query.page - 1) * query.limit;
    const pageRows = rows.slice(skip, skip + query.limit);

    return {
      data: pageRows.map((row) => ({
        id: row.id,
        fullName: row.fullName,
        avatarUrl: row.avatarUrl,
        zone: row.zone,
        amountInvested: row.amountInvested,
        amountRecovered: row.amountRecovered,
        recoveryRatePct: row.recoveryRatePct,
        motosCount: row.motosCount,
        status: row.status,
        joinedAt: row.createdAt.toISOString(),
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }
}
