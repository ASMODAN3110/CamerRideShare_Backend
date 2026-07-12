export enum InvestorStatus {
  ACTIVE = 'ACTIVE',
  LATE = 'LATE',
  INACTIVE = 'INACTIVE',
}

export const FRENCH_MONTH_LABELS = [
  'Jan',
  'Fév',
  'Mar',
  'Avr',
  'Mai',
  'Juin',
  'Juil',
  'Aoû',
  'Sep',
  'Oct',
  'Nov',
  'Déc',
] as const;

export interface MotoInvestorRow {
  investorId: number;
  targetAmount: number;
  financedAmount: number;
  city: string;
  status: string;
  driverId: number | null;
}

export interface InvestorMotoAggregate {
  amountInvested: number;
  amountRecovered: number;
  motosCount: number;
  zone: string | null;
  hasLateMoto: boolean;
}

export function recoveryRatePct(
  amountInvested: number,
  amountRecovered: number,
): number {
  if (amountInvested <= 0) {
    return 0;
  }
  return Math.round((amountRecovered / amountInvested) * 100);
}

export function modeZone(cities: string[]): string | null {
  if (cities.length === 0) {
    return null;
  }

  const counts = new Map<string, number>();
  for (const city of cities) {
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }

  let bestCity = cities[0];
  let bestCount = 0;
  for (const [city, count] of counts) {
    if (count > bestCount) {
      bestCount = count;
      bestCity = city;
    }
  }

  return bestCity;
}

export function resolveInvestorStatus(
  motosCount: number,
  hasLateMoto: boolean,
): InvestorStatus {
  if (motosCount === 0) {
    return InvestorStatus.INACTIVE;
  }
  if (hasLateMoto) {
    return InvestorStatus.LATE;
  }
  return InvestorStatus.ACTIVE;
}

export function aggregateMotosByInvestor(
  motos: MotoInvestorRow[],
  overdueDriverIds: Set<number>,
): Map<number, InvestorMotoAggregate> {
  const byInvestor = new Map<
    number,
    {
      amountInvested: number;
      amountRecovered: number;
      cities: string[];
      hasLateMoto: boolean;
    }
  >();

  for (const moto of motos) {
    const current = byInvestor.get(moto.investorId) ?? {
      amountInvested: 0,
      amountRecovered: 0,
      cities: [],
      hasLateMoto: false,
    };

    current.amountInvested += moto.targetAmount;
    current.amountRecovered += moto.financedAmount;
    current.cities.push(moto.city);

    if (
      moto.status === 'ACTIVE' &&
      moto.driverId !== null &&
      overdueDriverIds.has(moto.driverId)
    ) {
      current.hasLateMoto = true;
    }

    byInvestor.set(moto.investorId, current);
  }

  const result = new Map<number, InvestorMotoAggregate>();
  for (const [investorId, agg] of byInvestor) {
    result.set(investorId, {
      amountInvested: agg.amountInvested,
      amountRecovered: agg.amountRecovered,
      motosCount: agg.cities.length,
      zone: modeZone(agg.cities),
      hasLateMoto: agg.hasLateMoto,
    });
  }

  return result;
}
