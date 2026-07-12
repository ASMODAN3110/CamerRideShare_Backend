import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { IncidentStatus, PaymentStatus, PaymentType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { OVERDUE_DAYS } from '../common/utils/dashboard.utils';

@Injectable()
export class DriverService {
  constructor(private readonly prisma: PrismaService) {}

  async getProgress(userId: number) {
    const moto = await this.prisma.moto.findFirst({
      where: { driverId: userId },
    });

    let proprietePct = 0;
    let resteAPayer = 0;

    if (moto && moto.targetAmount > 0) {
      proprietePct = Math.min(
        100,
        Math.round((moto.financedAmount / moto.targetAmount) * 100),
      );
      resteAPayer = moto.targetAmount - moto.financedAmount;
    }

    const lastPayment = await this.prisma.payment.findFirst({
      where: { driverId: userId },
      orderBy: { createdAt: 'desc' },
    });

    let prochainPaiementJours = 0;
    let estAJour = false;

    if (lastPayment) {
      const now = new Date();
      const lastPaymentDate = new Date(lastPayment.createdAt);
      const diffMs = now.getTime() - lastPaymentDate.getTime();
      const daysSinceLastPayment = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      prochainPaiementJours = Math.max(0, 7 - daysSinceLastPayment);
      estAJour = daysSinceLastPayment <= OVERDUE_DAYS;
    }

    return {
      proprietePct,
      resteAPayer,
      prochainPaiementJours,
      estAJour,
    };
  }

  async getPayments(userId: number) {
    const payments = await this.prisma.payment.findMany({
      where: { driverId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return payments.map((p) => ({
      id: String(p.id),
      libelle:
        p.type === PaymentType.PAYMENT ? 'Versement' : 'Dépense',
      date: p.createdAt.toISOString(),
      montant: p.amount,
      paye: p.status === PaymentStatus.VERIFIED,
    }));
  }

  async createReport(userId: number, description: string) {
    const incident = await this.prisma.incident.create({
      data: {
        driverId: userId,
        description,
        type: 'SIGNALEMENT',
        status: IncidentStatus.OPEN,
      },
    });

    return {
      id: incident.id,
      status: incident.status,
    };
  }

  async deletePayment(userId: number, paymentId: number) {
    const payment = await this.prisma.payment.findFirst({
      where: { id: paymentId, driverId: userId },
    });

    if (!payment) {
      throw new NotFoundException('Paiement introuvable');
    }

    await this.prisma.payment.delete({
      where: { id: paymentId },
    });

    return { success: true };
  }
}
