import { Incident, Payment } from '@prisma/client';
import { formatDriverName } from '../common/utils/dashboard.utils';

type DriverSelect = {
  id: number;
  fullName: string;
  avatarUrl: string | null;
  phoneNumber: string;
} | null;

type InvestorSelect = {
  id: number;
  fullName: string;
} | null;

export type MotoWithRelations = {
  id: number;
  matricule: string;
  model: string;
  city: string;
  status: string;
  imageUrl: string | null;
  financedAmount: number;
  targetAmount: number;
  lastMaintenanceAt: Date | null;
  driverId: number | null;
  investorId: number | null;
  driver: DriverSelect;
  investor: InvestorSelect;
};

export function ownershipPct(financedAmount: number, targetAmount: number): number {
  if (targetAmount === 0) {
    return 0;
  }
  return Math.round((financedAmount / targetAmount) * 100);
}

const MONTHS_FR = [
  'Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin',
  'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc',
];

export function formatFooterInfo(
  lastMaintenanceAt: Date | null,
  openIncidentCount: number,
): string | null {
  if (openIncidentCount > 0) {
    return 'Incident ouvert';
  }
  if (!lastMaintenanceAt) {
    return null;
  }
  const day = lastMaintenanceAt.getDate();
  const month = MONTHS_FR[lastMaintenanceAt.getMonth()];
  return `Dernier entretien: ${day} ${month}`;
}

export function toMotoListItem(moto: MotoWithRelations, openIncidentCount = 0) {
  return {
    id: moto.id,
    matricule: moto.matricule,
    model: moto.model,
    city: moto.city,
    status: moto.status,
    imageUrl: moto.imageUrl,
    financedAmount: moto.financedAmount,
    targetAmount: moto.targetAmount,
    ownershipPct: ownershipPct(moto.financedAmount, moto.targetAmount),
    footerInfo: formatFooterInfo(moto.lastMaintenanceAt, openIncidentCount),
    driver: moto.driver
      ? {
          id: moto.driver.id,
          fullName: formatDriverName(moto.driver.fullName),
          avatarUrl: moto.driver.avatarUrl,
          phoneNumber: moto.driver.phoneNumber,
        }
      : null,
    investor: moto.investor
      ? {
          id: moto.investor.id,
          fullName: formatDriverName(moto.investor.fullName),
        }
      : null,
  };
}

export function toMotoDetail(
  moto: MotoWithRelations,
  openIncidents: Incident[],
  recentPayments: Payment[],
) {
  return {
    ...toMotoListItem(moto, openIncidents.length),
    lastMaintenanceAt: moto.lastMaintenanceAt?.toISOString().slice(0, 10) ?? null,
    openIncidents: openIncidents.map((incident) => ({
      id: incident.id,
      type: incident.type,
      description: incident.description,
      status: incident.status,
      createdAt: incident.createdAt.toISOString(),
    })),
    recentPayments: recentPayments.map((payment) => ({
      id: payment.id,
      amount: payment.amount,
      type: payment.type,
      status: payment.status,
      createdAt: payment.createdAt.toISOString(),
    })),
  };
}
