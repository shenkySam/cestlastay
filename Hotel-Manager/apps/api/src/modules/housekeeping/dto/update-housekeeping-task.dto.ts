import { IsEnum, IsOptional, IsString } from 'class-validator';
import { HousekeepingStatus } from '@hms/shared';

export class UpdateHousekeepingTaskDto {
  @IsOptional()
  @IsEnum(HousekeepingStatus)
  status?: HousekeepingStatus;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
