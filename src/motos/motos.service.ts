import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  IncidentStatus,
  MotoStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMotoDto } from './dto/create-moto.dto';
import { ListMotosQueryDto } from './dto/list-motos-query.dto';
import { UpdateMotoDto } from './dto/update-moto.dto';
import { toMotoDetail, toMotoListItem } from './moto.mapper';

const MOTO_LIST_INCLUDE = {
  driver: {
    select: {
      id: true,
      fullName: true,
      avatarUrl: true,
      phoneNumber: true,
    },
  },
  investor: {
    select: { id: true, fullName: true },
  },
} as const;

@Injectable()
export class MotosService {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(query: ListMotosQueryDto) {
    const where = this.buildListWhere(query);
    const skip = (query.page - 1) * query.limit;

    const [total, motos] = await Promise.all([
      this.prisma.moto.count({ where }),
      this.prisma.moto.findMany({
        where,
        include: MOTO_LIST_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip,
        take: query.limit,
      }),
    ]);

    const motoIds = motos.map((moto) => moto.id);
    const openIncidentCounts = await this.getOpenIncidentCounts(motoIds);

    return {
      data: motos.map((moto) =>
        toMotoListItem(moto, openIncidentCounts.get(moto.id) ?? 0),
      ),
      meta: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit) || 1,
      },
    };
  }

  async findOne(id: number) {
    const moto = await this.prisma.moto.findUnique({
      where: { id },
      include: MOTO_LIST_INCLUDE,
    });

    if (!moto) {
      throw new NotFoundException(`Moto with ID ${id} not found`);
    }

    const [openIncidents, recentPayments] = await Promise.all([
      this.prisma.incident.findMany({
        where: { motoId: id, status: IncidentStatus.OPEN },
        orderBy: { createdAt: 'desc' },
      }),
      moto.driverId
        ? this.prisma.payment.findMany({
            where: { driverId: moto.driverId },
            orderBy: { createdAt: 'desc' },
            take: 10,
          })
        : Promise.resolve([]),
    ]);

    return toMotoDetail(moto, openIncidents, recentPayments);
  }

  async getFilters() {
    const [cityRows, modelRows] = await Promise.all([
      this.prisma.moto.groupBy({
        by: ['city'],
        orderBy: { city: 'asc' },
      }),
      this.prisma.moto.groupBy({
        by: ['model'],
        orderBy: { model: 'asc' },
      }),
    ]);

    return {
      cities: cityRows.map((row) => row.city),
      models: modelRows.map((row) => row.model),
      statuses: Object.values(MotoStatus),
    };
  }

  /** Retourne les motos disponibles (sans conducteur) pour affectation. */
  async findAvailable() {
    return this.prisma.moto.findMany({
      where: { driverId: null, status: MotoStatus.ACTIVE },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(dto: CreateMotoDto) {
    await this.assertMatriculeUnique(dto.matricule);

    if (dto.driverId !== undefined) {
      await this.assertDriver(dto.driverId);
    }
    if (dto.investorId !== undefined) {
      await this.assertInvestor(dto.investorId);
    }

    const moto = await this.prisma.moto.create({
      data: {
        matricule: dto.matricule,
        model: dto.model,
        city: dto.city,
        targetAmount: dto.targetAmount,
        driverId: dto.driverId,
        investorId: dto.investorId,
        imageUrl: dto.imageUrl,
        status: MotoStatus.ACTIVE,
        financedAmount: 0,
      },
      include: MOTO_LIST_INCLUDE,
    });

    return toMotoListItem(moto, 0);
  }

  async update(id: number, dto: UpdateMotoDto) {
    await this.assertMotoExists(id);

    if (dto.matricule !== undefined) {
      await this.assertMatriculeUnique(dto.matricule, id);
    }
    if (dto.driverId !== undefined) {
      await this.assertDriver(dto.driverId);
    }
    if (dto.investorId !== undefined) {
      await this.assertInvestor(dto.investorId);
    }

    const data: Prisma.MotoUpdateInput = {};

    if (dto.matricule !== undefined) data.matricule = dto.matricule;
    if (dto.model !== undefined) data.model = dto.model;
    if (dto.city !== undefined) data.city = dto.city;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.targetAmount !== undefined) data.targetAmount = dto.targetAmount;
    if (dto.financedAmount !== undefined) data.financedAmount = dto.financedAmount;
    if (dto.imageUrl !== undefined) data.imageUrl = dto.imageUrl;
    if (dto.lastMaintenanceAt !== undefined) {
      data.lastMaintenanceAt = new Date(dto.lastMaintenanceAt);
    }
    if (dto.driverId !== undefined) {
      data.driver = { connect: { id: dto.driverId } };
    }
    if (dto.investorId !== undefined) {
      data.investor = { connect: { id: dto.investorId } };
    }

    const moto = await this.prisma.moto.update({
      where: { id },
      data,
      include: MOTO_LIST_INCLUDE,
    });

    const openIncidentCount = await this.prisma.incident.count({
      where: { motoId: id, status: IncidentStatus.OPEN },
    });

    return toMotoListItem(moto, openIncidentCount);
  }

  private buildListWhere(query: ListMotosQueryDto): Prisma.MotoWhereInput {
    const where: Prisma.MotoWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }
    if (query.city) {
      where.city = query.city;
    }
    if (query.model) {
      where.model = query.model;
    }
    if (query.search?.trim()) {
      const search = query.search.trim();
      where.OR = [
        { matricule: { contains: search, mode: 'insensitive' } },
        {
          driver: {
            fullName: { contains: search, mode: 'insensitive' },
          },
        },
      ];
    }

    return where;
  }

  private async getOpenIncidentCounts(motoIds: number[]) {
    const counts = new Map<number, number>();

    if (motoIds.length === 0) {
      return counts;
    }

    const rows = await this.prisma.incident.groupBy({
      by: ['motoId'],
      where: {
        motoId: { in: motoIds },
        status: IncidentStatus.OPEN,
      },
      _count: { _all: true },
    });

    for (const row of rows) {
      if (row.motoId !== null) {
        counts.set(row.motoId, row._count._all);
      }
    }

    return counts;
  }

  private async assertMotoExists(id: number) {
    const moto = await this.prisma.moto.findUnique({ where: { id } });
    if (!moto) {
      throw new NotFoundException(`Moto with ID ${id} not found`);
    }
  }

  private async assertMatriculeUnique(matricule: string, excludeId?: number) {
    const existing = await this.prisma.moto.findUnique({
      where: { matricule },
    });

    if (existing && existing.id !== excludeId) {
      throw new ConflictException('Matricule already exists');
    }
  }

  private async assertDriver(driverId: number) {
    const driver = await this.prisma.user.findUnique({
      where: { id: driverId },
    });

    if (!driver || driver.role !== UserRole.DRIVER) {
      throw new NotFoundException('Driver not found');
    }
  }

  private async assertInvestor(investorId: number) {
    const investor = await this.prisma.user.findUnique({
      where: { id: investorId },
    });

    if (!investor || investor.role !== UserRole.INVESTOR) {
      throw new NotFoundException('Investor not found');
    }
  }
}
