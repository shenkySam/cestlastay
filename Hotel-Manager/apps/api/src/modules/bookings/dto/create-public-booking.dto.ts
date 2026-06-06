import {
  IsString, IsEmail, IsDateString, IsInt, Min, IsOptional,
} from 'class-validator';

/**
 * Payload for the public, unauthenticated self-service booking endpoint
 * (`POST /bookings/public`). Mirrors the guest landing's
 * `CreatePublicBookingRequest` (apps/guest/src/types/booking.types.ts).
 */
export class CreatePublicBookingDto {
  @IsString()
  firstName: string;

  @IsString()
  lastName: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsDateString()
  checkInDate: string;

  @IsDateString()
  checkOutDate: string;

  @IsInt()
  @Min(1)
  numberOfGuests: number;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  specialRequests?: string;
}
