import { IsString, IsOptional, IsNumber, IsDateString, Min, IsInt } from 'class-validator';

export class CreateDiscountDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsString()
  description!: string;

  @IsString()
  discountType!: 'PERCENTAGE' | 'FIXED';

  @IsNumber()
  @Min(0)
  discountValue!: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minStays?: number;

  @IsOptional()
  @IsDateString()
  validFrom?: string;

  @IsDateString()
  validUntil!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxUses?: number;
}
