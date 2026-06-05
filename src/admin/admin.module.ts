import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AdminController } from './admin.controller';
import { AdminDashboardService } from './admin-dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [AdminController],
  providers: [AdminDashboardService],
})
export class AdminModule {}
