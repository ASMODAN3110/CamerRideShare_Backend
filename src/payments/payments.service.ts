import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PaymentStatus, PaymentType, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

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

    return this.prisma.payment.create({
      data: {
        driverId: dto.driverId,
        amount: dto.amount,
        type: dto.type,
        status: PaymentStatus.VERIFIED,
      },
    });
  }
}
