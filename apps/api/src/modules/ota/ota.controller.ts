import {
  Controller, Get, Post, Body, Query,
} from '@nestjs/common';
import { OtaService } from './ota.service';
import { CreateOtaBookingDto } from './dto/create-ota-booking.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, BookingSource } from '@hms/shared';

@Controller('ota')
export class OtaController {
  constructor(private readonly service: OtaService) {}

  @Post('bookings')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(
    @Body() dto: CreateOtaBookingDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.service.create(dto, user.id);
  }

  @Get('bookings')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll(
    @Query('source') source?: BookingSource,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.findAll({ source, from, to });
  }

  @Get('revenue')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  revenue(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getRevenueReport({ from, to });
  }
}
