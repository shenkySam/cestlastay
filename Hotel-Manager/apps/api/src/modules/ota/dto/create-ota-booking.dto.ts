import {
  IsString, IsDateString, IsNumber, IsOptional, IsEnum, IsIn, Min, IsArray, ArrayNotEmpty,
} from 'class-validator';
import { BookingSource } from '@hms/shared';

const OTA_SOURCES = [
  BookingSource.BOOKING_COM,
  BookingSource.AIRBNB,
  BookingSource.EXPEDIA,
  BookingSource.AGODA,
  BookingSource.OTHER_OTA,
] as const;

export class CreateOtaBookingDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  roomIds: string[];

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsNumber()
  @Min(1)
  numberOfGuests: number;

  @IsEnum(BookingSource)
  @IsIn(OTA_SOURCES as unknown as BookingSource[])
  source: BookingSource;

  @IsString()
  otaBookingId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  otaCommission?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number;

  // Guest — either reference an existing guest, or supply walk-in style fields
  @IsOptional()
  @IsString()
  guestId?: string;

  @IsOptional()
  @IsString()
  guestFirstName?: string;

  @IsOptional()
  @IsString()
  guestLastName?: string;

  @IsOptional()
  @IsString()
  guestEmail?: string;

  @IsOptional()
  @IsString()
  guestPhone?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
