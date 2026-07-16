import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { join } from 'path';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayloadUser } from '../auth/types/jwt-payload-user.type';
import { DriverService } from './driver.service';
import { CreateReportDto } from './dto/create-report.dto';
import { ListPaymentsQueryDto } from './dto/list-payments-query.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { Enable2FADto } from './dto/enable-2fa.dto';

@Controller('driver')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.DRIVER)
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  // ─── Routes existantes ─────────────────────────────────────

  @Get('progress')
  getProgress(@CurrentUser() user: JwtPayloadUser) {
    return this.driverService.getProgress(user.userId);
  }

  @Get('payments/summary')
  getPaymentSummary(@CurrentUser() user: JwtPayloadUser) {
    return this.driverService.getPaymentSummary(user.userId);
  }

  @Get('payments')
  getPayments(
    @CurrentUser() user: JwtPayloadUser,
    @Query() query: ListPaymentsQueryDto,
  ) {
    return this.driverService.getPayments(user.userId, query.page ?? 1, query.limit ?? 10);
  }

  @Post('reports')
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('photo', {
      dest: join(process.cwd(), 'uploads', 'incidents'),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  createReport(
    @CurrentUser() user: JwtPayloadUser,
    @Body() dto: CreateReportDto,
    @UploadedFile() photo?: { filename: string; originalname: string; mimetype: string; size: number; path: string },
  ) {
    const photoUrl = photo ? `/uploads/incidents/${photo.filename}` : null;
    return this.driverService.createReport(user.userId, dto.description, dto.categorie, photoUrl);
  }

  @Get('faq')
  getFaq() {
    return this.driverService.getFaq();
  }

  @Get('support/config')
  getSupportConfig() {
    return this.driverService.getSupportConfig();
  }

  @Delete('payments/:id')
  deletePayment(@CurrentUser() user: JwtPayloadUser, @Param('id', ParseIntPipe) id: number) {
    return this.driverService.deletePayment(user.userId, id);
  }

  // ─── Paramètres (notifications + langue) ───────────────────

  @Get('settings')
  getSettings(@CurrentUser() user: JwtPayloadUser) {
    return this.driverService.getSettings(user.userId);
  }

  @Put('settings')
  updateSettings(@CurrentUser() user: JwtPayloadUser, @Body() dto: UpdateSettingsDto) {
    return this.driverService.updateSettings(user.userId, dto);
  }

  // ─── Modification du profil ─────────────────────────────────

  @Put('profile')
  updateProfile(@CurrentUser() user: JwtPayloadUser, @Body() dto: UpdateProfileDto) {
    return this.driverService.updateProfile(user.userId, dto);
  }

  // ─── Changement de mot de passe ─────────────────────────────

  @Put('password')
  changePassword(@CurrentUser() user: JwtPayloadUser, @Body() dto: ChangePasswordDto) {
    return this.driverService.changePassword(user.userId, dto.currentPassword, dto.newPassword);
  }

  // ─── Activation 2FA ─────────────────────────────────────────

  @Post('2fa/enable')
  @HttpCode(200)
  enable2FA(@CurrentUser() user: JwtPayloadUser, @Body() dto: Enable2FADto) {
    return this.driverService.enable2FA(user.userId, dto.phoneNumber);
  }
}
