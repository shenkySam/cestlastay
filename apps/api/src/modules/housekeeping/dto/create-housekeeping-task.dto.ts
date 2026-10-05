import { IsString, IsOptional, IsNumber, IsDateString, Min, Max } from 'class-validator';

export class CreateHousekeepingTaskDto {
  @IsString()
  roomId: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsString()
  taskType: string; // checkout_cleaning | daily_cleaning | deep_cleaning

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsDateString()
  scheduledFor: string;
}
