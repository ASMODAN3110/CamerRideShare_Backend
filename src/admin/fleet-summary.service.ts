import { Injectable } from '@nestjs/common';
import { IncidentStatus, MotoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FleetSummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary() {
    const [total, inMaintenance, stolenCount, activeWithOpenIncidentRows] =
      await Promise.all([
        this.prisma.moto.count(),
        this.prisma.moto.count({ where: { status: MotoStatus.BROKEN } }),
        this.prisma.moto.count({ where: { status: MotoStatus.STOLEN } }),
        this.prisma.incident.findMany({
          where: {
            status: IncidentStatus.OPEN,
            motoId: { not: null },
            moto: { status: MotoStatus.ACTIVE },
          },
          distinct: ['motoId'],
          select: { motoId: true },
        }),
      ]);

    const activeIncidentMotoIds = new Set(
      activeWithOpenIncidentRows
        .map((row) => row.motoId)
        .filter((id): id is number => id !== null),
    );

    const incidents = stolenCount + activeIncidentMotoIds.size;
    const available = total - inMaintenance - incidents;

    return {
      total,
      available,
      inMaintenance,
      incidents,
    };
  }
}
