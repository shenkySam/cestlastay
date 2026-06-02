import { IsString, IsEnum, IsNumber, IsOptional, IsArray, Min } from 'class-validator';
import { RoomType } from '@hms/shared';

export class CreateRoomCategoryDto {
  @IsString()
  name: string;

  @IsEnum(RoomType)
  type: RoomType;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  basePrice: number;

  @IsNumber()
  @Min(1)
  maxOccupancy: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  amenities?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
