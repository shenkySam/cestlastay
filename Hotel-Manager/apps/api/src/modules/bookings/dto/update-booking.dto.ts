import { IsString, IsDateString, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { BookingStatus } from '@hms/shared';

export class UpdateBookingDto {
  @IsOptional()
  @IsDateString()
  checkInDate?: string;

  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  numberOfGuests?: number;

  @IsOptional()
  @IsEnum(BookingStatus)
  status?: BookingStatus;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
