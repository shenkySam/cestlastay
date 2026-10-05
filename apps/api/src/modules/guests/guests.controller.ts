import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { GuestsService } from './guests.service';
import { CreateGuestDto } from './dto/create-guest.dto';
import { UpdateGuestDto } from './dto/update-guest.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@hms/shared';

@Controller('guests')
export class GuestsController {
  constructor(private readonly service: GuestsService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll(@Query('search') search?: string) {
    return this.service.findAll(search);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Get(':id/bookings')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findBookings(@Param('id') id: string) {
    return this.service.findBookings(id);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  create(@Body() dto: CreateGuestDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateGuestDto) {
    return this.service.update(id, dto);
  }
}
