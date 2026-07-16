import { IsString, IsNotEmpty } from 'class-validator';

export class Enable2FADto {
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;
}
