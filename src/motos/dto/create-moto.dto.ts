import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Min,
} from 'class-validator';

export class CreateMotoDto {
  @IsString()
  @IsNotEmpty()
  matricule: string;

  @IsString()
  @IsNotEmpty()
  model: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsInt()
  @Min(1)
  targetAmount: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  driverId?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  investorId?: number;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
