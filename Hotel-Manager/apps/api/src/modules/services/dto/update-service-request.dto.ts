import { IsEnum, IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { ServiceStatus } from '@hms/shared';

export class UpdateServiceRequestDto {
  @IsOptional()
  @IsEnum(ServiceStatus)
  status?: ServiceStatus;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;
}
