import { IsString, IsNotEmpty, IsIn, IsOptional } from 'class-validator';

const CATEGORIES = [
  'Panne mécanique',
  'Accident',
  'Retard de paiement',
  'Autre',
] as const;

export type ReportCategorie = (typeof CATEGORIES)[number];

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(CATEGORIES)
  categorie: ReportCategorie;
}
