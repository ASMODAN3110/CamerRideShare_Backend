import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateMotoDto } from './dto/create-moto.dto';
import { ListMotosQueryDto } from './dto/list-motos-query.dto';
import { UpdateMotoDto } from './dto/update-moto.dto';
import { MotosService } from './motos.service';

@Controller('motos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class MotosController {
  constructor(private readonly motosService: MotosService) {}

  @Get()
  findPaginated(@Query() query: ListMotosQueryDto) {
    return this.motosService.findPaginated(query);
  }

  @Get('filters')
  getFilters() {
    return this.motosService.getFilters();
  }

  @Get('available')
  findAvailable() {
    return this.motosService.findAvailable();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.motosService.findOne(id);
  }

  @Post()
  @HttpCode(201)
  create(@Body() dto: CreateMotoDto) {
    return this.motosService.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMotoDto,
  ) {
    return this.motosService.update(id, dto);
  }
}
