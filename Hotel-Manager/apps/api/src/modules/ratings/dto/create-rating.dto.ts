import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateRatingDto {
  @IsUUID()
  bookingId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  overallRating: number;

  @IsInt()
  @Min(1)
  @Max(5)
  roomRating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
