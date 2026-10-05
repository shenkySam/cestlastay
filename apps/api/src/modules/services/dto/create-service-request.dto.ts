import { IsString, IsEnum, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { ServiceType } from '@hms/shared';

export class CreateServiceRequestDto {
  @IsString()
  guestId: string;

  @IsOptional()
  @IsString()
  bookingId?: string;

  @IsEnum(ServiceType)
  type: ServiceType;

  @IsString()
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(5)
  priority?: number;
}
