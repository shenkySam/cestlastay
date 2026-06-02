import { IsEnum, IsOptional, IsString } from 'class-validator';
import { RoomStatus } from '@hms/shared';

export class UpdateRoomStatusDto {
  @IsEnum(RoomStatus)
  status: RoomStatus;

  @IsOptional()
  @IsString()
  maintenanceNotes?: string;
}
