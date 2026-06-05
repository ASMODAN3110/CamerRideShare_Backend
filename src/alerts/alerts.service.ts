import { Injectable } from '@nestjs/common';
import {
  IncidentStatus,
  MotoStatus,
  PaymentStatus,
  PaymentType,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatDriverName } from '../common/utils/dashboard.utils';
import { ListAlertsQueryDto } from './dto/list-alerts-query.dto';

const OVERDUE_DAYS = 21;
const WEEKLY_PAYMENT_ESTIMATE = 15000;

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  async findHighPriority(_query: ListAlertsQueryDto) {
    const [overdueAlerts, incidentAlerts] = await Promise.all([
      this.buildPaymentOverdueAlerts(),
      this.buildIncidentAlerts(),
    ]);

    return [...overdueAlerts, ...incidentAlerts];
  }

  private async buildPaymentOverdueAlerts() {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - OVERDUE_DAYS);

    const drivers = await this.prisma.user.findMany({
      where: { role: UserRole.DRIVER },
      include: {
        payments: {
          where: {
            status: PaymentStatus.VERIFIED,
            type: PaymentType.PAYMENT,
            createdAt: { gte: cutoff },
          },
          take: 1,
        },
        motosAsDriver: {
          where: { status: MotoStatus.ACTIVE },
          take: 1,
        },
      },
    });

    return drivers
      .filter((driver) => driver.payments.length === 0)
      .map((driver) => ({
        id: driver.id,
        driverName: formatDriverName(driver.fullName),
        location: driver.motosAsDriver[0]?.city ?? '—',
        type: 'PAYMENT_OVERDUE' as const,
        label: '3 semaines de retard',
        amount: -(WEEKLY_PAYMENT_ESTIMATE * 3),
        avatarUrl: driver.avatarUrl,
      }));
  }

  private async buildIncidentAlerts() {
    const incidents = await this.prisma.incident.findMany({
      where: { status: IncidentStatus.OPEN },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        driver: true,
        moto: true,
      },
    });

    return incidents.map((incident) => ({
      id: incident.id,
      driverName: formatDriverName(incident.driver.fullName),
      location: incident.moto?.city ?? '—',
      type: 'INCIDENT' as const,
      label: 'Incident signalé',
      avatarUrl: incident.driver.avatarUrl,
    }));
  }
}
