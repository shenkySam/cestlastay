import { IsBoolean, IsOptional } from 'class-validator';

export class CreateFolioDto {
  // Defaults by booking source: OTA bookings exclude the room charge, direct bookings include it.
  @IsOptional()
  @IsBoolean()
  includeRoomCharge?: boolean;
}
