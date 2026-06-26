import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

/** Payload for the public newsletter signup (`POST /crm/subscribe`). */
export class SubscribeDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}
