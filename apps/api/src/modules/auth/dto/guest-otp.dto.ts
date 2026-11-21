import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class GuestOtpRequestDto {
  @IsEmail()
  @MaxLength(254)
  email: string;
}

export class GuestOtpVerifyDto {
  @IsEmail()
  @MaxLength(254)
  email: string;

  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit code from the email' })
  code: string;

  /** Landing site: return a one-time portal handoff code instead of a session. */
  @IsOptional()
  @IsBoolean()
  handoff?: boolean;
}

export class GuestHandoffDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  code: string;
}
