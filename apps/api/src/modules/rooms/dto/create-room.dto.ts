import { IsString, IsNumber, IsOptional, IsBoolean, Min } from 'class-validator';

export class CreateRoomDto {
  @IsString()
  roomNumber: string;

  @IsString()
  categoryId: string;

  @IsNumber()
  @Min(1)
  floor: number;

  @IsOptional()
  @IsString()
  maintenanceNotes?: string;

  @IsOptional()
  @IsBoolean()
  isVip?: boolean;
}
