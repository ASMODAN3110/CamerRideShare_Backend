import { IsEnum, IsInt, Min } from 'class-validator';
import { PaymentType } from '@prisma/client';

export class CreatePaymentDto {
  @IsInt()
  @Min(1)
  driverId: number;

  @IsInt()
  @Min(1)
  amount: number;

  @IsEnum(PaymentType)
  type: PaymentType;
}
