import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateRoomDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  floor?: number;

  @IsOptional()
  @IsString()
  maintenanceNotes?: string;
}
