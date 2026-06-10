import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, PaymentType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatDriverName } from '../common/utils/dashboard.utils';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

const driverInclude = {
  select: {
    id: true,
    fullName: true,
    avatarUrl: true,
    phoneNumber: true,
  },
};

@Injectable()
export class PaymentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePaymentDto) {
    const driver = await this.prisma.user.findUnique({
      where: { id: dto.driverId },
    });

    if (!driver || driver.role !== UserRole.DRIVER) {
      throw new NotFoundException('Driver not found');
    }

    if (dto.amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    const payment = await this.prisma.payment.create({
      data: {
        driverId: dto.driverId,
        amount: dto.amount,
        type: dto.type,
        status: PaymentStatus.VERIFIED,
      },
      include: { driver: driverInclude },
    });

    return this.toPaymentDetail(payment);
  }

  async findOne(id: number) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: { driver: driverInclude },
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    return this.toPaymentDetail(payment);
  }

  async update(id: number, dto: UpdatePaymentDto) {
    await this.findOne(id);

    const payment = await this.prisma.payment.update({
      where: { id },
      data: dto.status !== undefined ? { status: dto.status } : {},
      include: { driver: driverInclude },
    });

    return this.toPaymentDetail(payment);
  }

  private toPaymentDetail(
    payment: {
      id: number;
      driverId: number;
      amount: number;
      type: PaymentType;
      status: PaymentStatus;
      createdAt: Date;
      driver: {
        id: number;
        fullName: string;
        avatarUrl: string | null;
        phoneNumber: string;
      };
    },
  ) {
    return {
      id: payment.id,
      driverId: payment.driverId,
      driver: {
        id: payment.driver.id,
        fullName: formatDriverName(payment.driver.fullName),
        avatarUrl: payment.driver.avatarUrl,
        phoneNumber: payment.driver.phoneNumber,
      },
      amount: payment.amount,
      type: payment.type,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    };
  }
}
