import { Controller, Get, Post, Param, ForbiddenException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@hms/shared';

type AuthedUser = {
  id: string;
  role: string;
  bookingId?: string;
};

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly service: InvoicesService) {}

  @Get()
  @Roles(UserRole.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Accessible to guests too — they view their own invoice via booking ID
  @Get('booking/:bookingId')
  findByBooking(@CurrentUser() user: AuthedUser, @Param('bookingId') bookingId: string) {
    // Guests can only view the invoice for their own booking.
    if (user.role === UserRole.GUEST && user.bookingId !== bookingId) {
      throw new ForbiddenException();
    }
    return this.service.findByBookingId(bookingId);
  }

  // Generate (or retrieve existing) invoice for a booking
  @Post('booking/:bookingId/generate')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  generate(@Param('bookingId') bookingId: string) {
    return this.service.generateForBooking(bookingId);
  }
}
