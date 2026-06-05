import { Injectable } from '@nestjs/common';
import { MotoStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MotosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Retourne toutes les motos avec les infos du conducteur et de l'investisseur. */
  async findAll() {
    return this.prisma.moto.findMany({
      include: {
        driver: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
        investor: {
          select: { id: true, fullName: true, phoneNumber: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Retourne les motos disponibles (sans conducteur) pour affectation. */
  async findAvailable() {
    return this.prisma.moto.findMany({
      where: { driverId: null, status: MotoStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }
}
