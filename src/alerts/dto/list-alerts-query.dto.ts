import { IsIn, IsOptional } from 'class-validator';

export class ListAlertsQueryDto {
  @IsOptional()
  @IsIn(['high', 'medium', 'low'])
  priority: 'high' | 'medium' | 'low' = 'high';
}
