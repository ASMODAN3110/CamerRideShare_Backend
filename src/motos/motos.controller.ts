import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MotosService } from './motos.service';

@Controller('motos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MotosController {
  constructor(private readonly motosService: MotosService) {}

  @Get()
  findAll() {
    return this.motosService.findAll();
  }

  @Get('available')
  findAvailable() {
    return this.motosService.findAvailable();
  }
}
