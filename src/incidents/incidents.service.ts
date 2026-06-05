import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncidentDto } from './dto/create-incident.dto';

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateIncidentDto) {
    const driver = await this.prisma.user.findUnique({
      where: { id: dto.driverId },
    });

    if (!driver || driver.role !== UserRole.DRIVER) {
      throw new NotFoundException('Driver not found');
    }

    if (dto.motoId) {
      const moto = await this.prisma.moto.findUnique({
        where: { id: dto.motoId },
      });
      if (!moto) {
        throw new NotFoundException('Moto not found');
      }
      if (moto.driverId !== dto.driverId) {
        throw new BadRequestException('Moto is not assigned to this driver');
      }
    }

    return this.prisma.incident.create({
      data: {
        driverId: dto.driverId,
        motoId: dto.motoId,
        type: dto.type,
        description: dto.description,
        status: IncidentStatus.OPEN,
      },
    });
  }
}
