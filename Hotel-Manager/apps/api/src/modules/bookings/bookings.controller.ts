import {
  Controller, Get, Post, Patch, Body, Param, Query,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, BookingStatus } from '@hms/shared';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly service: BookingsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll(
    @Query('status') status?: BookingStatus,
    @Query('guestId') guestId?: string,
    @Query('roomId') roomId?: string,
    @Query('search') search?: string,
  ) {
    return this.service.findAll({ status, guestId, roomId, search });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(
    @Body() dto: CreateBookingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateBookingDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/check-in')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  checkIn(@Param('id') id: string) {
    return this.service.checkIn(id);
  }

  @Post(':id/check-out')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  checkOut(@Param('id') id: string) {
    return this.service.checkOut(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
