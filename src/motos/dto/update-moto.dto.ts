import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { MotoStatus } from '@prisma/client';
import { CreateMotoDto } from './create-moto.dto';

export class UpdateMotoDto extends PartialType(CreateMotoDto) {
  @IsOptional()
  @IsEnum(MotoStatus)
  status?: MotoStatus;

  @IsOptional()
  @IsInt()
  @Min(0)
  financedAmount?: number;

  @IsOptional()
  @IsDateString()
  lastMaintenanceAt?: string;
}
