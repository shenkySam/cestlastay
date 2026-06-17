import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateInvoiceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;

  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
