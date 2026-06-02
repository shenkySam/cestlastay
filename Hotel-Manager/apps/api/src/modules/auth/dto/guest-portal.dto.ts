import { IsString, IsNotEmpty } from 'class-validator';

export class GuestPortalDto {
  @IsString()
  @IsNotEmpty()
  bookingNumber: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;
}
