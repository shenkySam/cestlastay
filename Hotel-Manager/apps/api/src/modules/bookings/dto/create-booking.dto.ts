import {
  IsString, IsDateString, IsNumber, IsOptional, IsEnum, Min,
} from 'class-validator';
import { BookingSource } from '@hms/shared';

export class CreateBookingDto {
  @IsString()
  guestId: string;

  @IsString()
  roomId: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsNumber()
  @Min(1)
  numberOfGuests: number;

  @IsOptional()
  @IsEnum(BookingSource)
  source?: BookingSource;

  @IsOptional()
  @IsString()
  specialRequests?: string;

  @IsOptional()
  @IsString()
  discountCode?: string;
}
