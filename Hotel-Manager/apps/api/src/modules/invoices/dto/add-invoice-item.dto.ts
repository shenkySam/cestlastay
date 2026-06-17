import { IsInt, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// Either serviceRequestId (pull description + cost from the ticket)
// or a manual line: description + unitPrice (+ optional quantity).
export class AddInvoiceItemDto {
  @IsOptional()
  @IsString()
  serviceRequestId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;
}
