import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ListInvestorsQueryDto } from './dto/list-investors-query.dto';
import { RoiTrendQueryDto } from './dto/roi-trend-query.dto';
import { InvestorsListService } from './investors-list.service';
import { InvestorsRoiService } from './investors-roi.service';
import { InvestorsSummaryService } from './investors-summary.service';

@Controller('admin/investors')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminInvestorsController {
  constructor(
    private readonly summaryService: InvestorsSummaryService,
    private readonly listService: InvestorsListService,
    private readonly roiService: InvestorsRoiService,
  ) {}

  @Get('summary')
  getSummary() {
    return this.summaryService.getSummary();
  }

  @Get('roi-trend')
  getRoiTrend(@Query() query: RoiTrendQueryDto) {
    return this.roiService.getTrend(query);
  }

  @Get()
  findPaginated(@Query() query: ListInvestorsQueryDto) {
    return this.listService.findPaginated(query);
  }
}
