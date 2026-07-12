import { UserRole } from '@prisma/client';

export function deltaPct(current: number, previous: number): number {
  if (previous === 0) {
    return 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

export function currentPeriod(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

export function previousPeriod(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  return currentPeriod(d);
}

export const DEFAULT_WEEKLY_VERSEMENT = 15000;
export const OVERDUE_DAYS = 21;

export function startOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

export function endOfMonth(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

/** Nombre de semaines calendaires (lun–dim) touchant le mois. */
export function weeksInMonth(date = new Date()): number {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const weeks = new Set<string>();
  const cursor = new Date(start);

  while (cursor <= end) {
    weeks.add(startOfWeek(cursor).toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return weeks.size;
}

export function startOfWeek(date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfWeek(date = new Date()): Date {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function formatDriverName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length <= 1) {
    return fullName;
  }
  const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
  return `${parts[0]} ${lastInitial}.`;
}

export const ADMIN_ROLES = [UserRole.ADMIN] as const;
