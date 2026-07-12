import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminInvestorsController } from './admin-investors.controller';
import { FleetSummaryService } from './fleet-summary.service';
import { InvestorsListService } from './investors-list.service';
import { InvestorsMetricsService } from './investors-metrics.service';
import { InvestorsRoiService } from './investors-roi.service';
import { InvestorsSummaryService } from './investors-summary.service';
import { PaymentsSummaryService } from './payments-summary.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController, AdminInvestorsController],
  providers: [
    AdminDashboardService,
    FleetSummaryService,
    PaymentsSummaryService,
    InvestorsMetricsService,
    InvestorsSummaryService,
    InvestorsListService,
    InvestorsRoiService,
  ],
})
export class AdminModule {}
