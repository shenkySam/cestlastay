import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CrmService } from './crm.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@hms/shared';
import { CreateDiscountDto } from './dto/create-discount.dto';

@Controller('crm')
export class CrmController {
  constructor(private readonly service: CrmService) {}

  // ── Email logs ──────────────────────────────────────
  @Get('emails')
  @Roles(UserRole.ADMIN)
  listEmails(
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    return this.service.listEmails({ type, status, search });
  }

  @Get('emails/stats')
  @Roles(UserRole.ADMIN)
  emailStats() {
    return this.service.getEmailStats();
  }

  @Get('triggers')
  @Roles(UserRole.ADMIN)
  triggers() {
    return this.service.describeTriggers();
  }

  // Manual email triggers (admin-only convenience)
  @Post('emails/trigger/booking-confirmation/:bookingId')
  @Roles(UserRole.ADMIN)
  triggerBookingConfirmation(@Param('bookingId') bookingId: string) {
    return this.service.sendBookingConfirmation(bookingId);
  }

  @Post('emails/trigger/check-in-reminder/:bookingId')
  @Roles(UserRole.ADMIN)
  triggerCheckInReminder(@Param('bookingId') bookingId: string) {
    return this.service.sendCheckInReminder(bookingId);
  }

  @Post('emails/trigger/loyalty-discount/:bookingId')
  @Roles(UserRole.ADMIN)
  triggerLoyaltyDiscount(@Param('bookingId') bookingId: string) {
    return this.service.sendPostStayDiscount(bookingId);
  }

  // ── Discount codes ──────────────────────────────────
  @Get('discount-codes')
  @Roles(UserRole.ADMIN)
  listDiscounts() {
    return this.service.listDiscounts();
  }

  @Post('discount-codes')
  @Roles(UserRole.ADMIN)
  createDiscount(@Body() dto: CreateDiscountDto) {
    return this.service.createDiscount(dto);
  }

  @Patch('discount-codes/:id/toggle')
  @Roles(UserRole.ADMIN)
  toggleDiscount(@Param('id') id: string, @Body() body: { isActive: boolean }) {
    return this.service.toggleDiscount(id, body.isActive);
  }

  @Delete('discount-codes/:id')
  @Roles(UserRole.ADMIN)
  deleteDiscount(@Param('id') id: string) {
    return this.service.deleteDiscount(id);
  }
}
