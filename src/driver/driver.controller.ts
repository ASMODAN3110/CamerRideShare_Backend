import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayloadUser } from '../auth/types/jwt-payload-user.type';
import { DriverService } from './driver.service';
import { CreateReportDto } from './dto/create-report.dto';

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('progress')
  getProgress(@CurrentUser() user: JwtPayloadUser) {
    return this.driverService.getProgress(user.userId);
  }

  @Get('payments')
  getPayments(@CurrentUser() user: JwtPayloadUser) {
    return this.driverService.getPayments(user.userId);
  }

  @Post('reports')
  @HttpCode(201)
  createReport(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateReportDto,
  ) {
    return this.driverService.createReport(user.userId, dto.description);
  }

  @Delete('payments/:id')
  deletePayment(
    @CurrentUser() user: JwtPayloadUser,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.driverService.deletePayment(user.userId, id);
  }
}
