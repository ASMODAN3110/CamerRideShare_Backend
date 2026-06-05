import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CreateIncidentDto {
  @IsInt()
  @Min(1)
  driverId: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  motoId?: number;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsNotEmpty()
  description: string;
}
