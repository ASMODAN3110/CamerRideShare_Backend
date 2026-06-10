import { Controller, Get, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import { FleetSummaryService } from './fleet-summary.service';
import { PaymentsSummaryService } from './payments-summary.service';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminController {
  constructor(
    private readonly adminDashboardService: AdminDashboardService,
    private readonly fleetSummaryService: FleetSummaryService,
    private readonly paymentsSummaryService: PaymentsSummaryService,
  ) {}

  @Get('dashboard/overview')
  getOverview() {
    return this.adminDashboardService.getOverview();
  }

  @Get('fleet/summary')
  getFleetSummary() {
    return this.fleetSummaryService.getSummary();
  }

  @Get('payments/summary')
  getPaymentsSummary() {
    return this.paymentsSummaryService.getSummary();
  }
}
