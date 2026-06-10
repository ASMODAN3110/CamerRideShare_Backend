import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';
import { FleetSummaryService } from './fleet-summary.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminDashboardService, FleetSummaryService],
})
export class AdminModule {}
