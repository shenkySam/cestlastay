import { IsString, IsNumber, IsOptional, Min } from 'class-validator';

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
}
