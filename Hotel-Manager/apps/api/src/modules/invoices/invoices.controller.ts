import { Controller, Get, Post, Param } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@hms/shared';

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
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.service.findByBookingId(bookingId);
  }

  // Generate (or retrieve existing) invoice for a booking
  @Post('booking/:bookingId/generate')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  generate(@Param('bookingId') bookingId: string) {
    return this.service.generateForBooking(bookingId);
  }
}
