import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatDriverName } from '../common/utils/dashboard.utils';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(query: ListTransactionsQueryDto) {
    const where = this.buildWhere(query);
    const skip = (query.page - 1) * query.limit;

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: query.limit,
        orderBy: { createdAt: query.sort },
        include: {
          driver: {
            select: {
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments.map((payment) => ({
        id: payment.id,
        driver: {
          fullName: formatDriverName(payment.driver.fullName),
          avatarUrl: payment.driver.avatarUrl,
        },
        createdAt: payment.createdAt.toISOString(),
        status: payment.status,
        type: payment.type,
        amount: payment.amount,
      })),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  private buildWhere(query: ListTransactionsQueryDto): Prisma.PaymentWhereInput {
    const where: Prisma.PaymentWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.type) {
      where.type = query.type;
    }
    if (query.search?.trim()) {
      const term = query.search.trim();
      const amount = Number(term);
      const or: Prisma.PaymentWhereInput[] = [
        {
          driver: {
            fullName: { contains: term, mode: 'insensitive' },
          },
        },
      ];
      if (!Number.isNaN(amount)) {
        or.push({ amount });
      }
      where.OR = or;
    }

    return where;
  }
}
