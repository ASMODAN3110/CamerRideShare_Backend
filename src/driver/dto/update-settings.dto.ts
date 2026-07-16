import { IsBoolean, IsIn, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  smsAlerts?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotifications?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentReminders?: boolean;

  @IsOptional()
  @IsIn(['fr', 'en'])
  language?: 'fr' | 'en';
}
