import { Controller, Get, Post, Patch, Delete, Body, Param, ForbiddenException } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '@hms/shared';
import { CreateFolioDto } from './dto/create-folio.dto';
import { AddInvoiceItemDto } from './dto/add-invoice-item.dto';
import { UpdateInvoiceItemDto } from './dto/update-invoice-item.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';

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

  // Accessible to guests too — they view their own invoice via booking ID.
  // Guests never see DRAFT invoices (hidden until staff issue them).
  @Get('booking/:bookingId')
  findByBooking(@CurrentUser() user: AuthedUser, @Param('bookingId') bookingId: string) {
    const isGuest = user.role === UserRole.GUEST;
    if (isGuest && user.bookingId !== bookingId) {
      throw new ForbiddenException();
    }
    return this.service.findByBookingId(bookingId, { hideDraft: isGuest });
  }

  // Completed, priced service requests not yet on an invoice (the "pull unbilled" picker)
  @Get('booking/:bookingId/billable-services')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  billableServices(@Param('bookingId') bookingId: string) {
    return this.service.getBillableServices(bookingId);
  }

  // Create a DRAFT folio for a booking
  @Post('booking/:bookingId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  createFolio(@Param('bookingId') bookingId: string, @Body() dto: CreateFolioDto) {
    return this.service.createFolio(bookingId, dto);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    return this.service.update(id, dto);
  }

  // DRAFT → PENDING: reveals the invoice to the guest
  @Post(':id/issue')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  issue(@Param('id') id: string) {
    return this.service.issue(id);
  }

  @Post(':id/items')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  addItem(@Param('id') id: string, @Body() dto: AddInvoiceItemDto) {
    return this.service.addItem(id, dto);
  }

  @Patch(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateInvoiceItemDto,
  ) {
    return this.service.updateItem(id, itemId, dto);
  }

  @Delete(':id/items/:itemId')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  removeItem(@Param('id') id: string, @Param('itemId') itemId: string) {
    return this.service.removeItem(id, itemId);
  }
}
