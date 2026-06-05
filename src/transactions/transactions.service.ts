import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatDriverName } from '../common/utils/dashboard.utils';
import { ListTransactionsQueryDto } from './dto/list-transactions-query.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async findRecent(query: ListTransactionsQueryDto) {
    const payments = await this.prisma.payment.findMany({
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
    });

    return payments.map((payment) => ({
      id: payment.id,
      driver: {
        fullName: formatDriverName(payment.driver.fullName),
        avatarUrl: payment.driver.avatarUrl,
      },
      createdAt: payment.createdAt.toISOString(),
      status: payment.status,
      type: payment.type,
      amount: payment.amount,
    }));
  }
}
