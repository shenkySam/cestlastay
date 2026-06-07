import { Controller, Get, Post, Patch, Body, Param, Query, ForbiddenException } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole, ServiceStatus, ServiceType } from '@hms/shared';

type AuthedUser = {
  id: string;
  role: string;
  guest?: { id: string } | null;
  bookingId?: string;
};

@Controller('services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF, UserRole.GUEST)
  findAll(
    @CurrentUser() user: AuthedUser,
    @Query('status') status?: ServiceStatus,
    @Query('type') type?: ServiceType,
    @Query('guestId') guestId?: string,
  ) {
    // Guests can only see their own service requests — ignore any guestId they send.
    if (user.role === UserRole.GUEST) {
      guestId = user.guest?.id;
    }
    return this.service.findAll({ status, type, guestId });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Guests and staff can create service requests
  @Post()
  create(@CurrentUser() user: AuthedUser, @Body() dto: CreateServiceRequestDto) {
    // Guests can only create requests for themselves and their own booking.
    if (user.role === UserRole.GUEST) {
      if (!user.guest?.id || !user.bookingId) throw new ForbiddenException();
      dto.guestId = user.guest.id;
      dto.bookingId = user.bookingId;
    }
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateServiceRequestDto) {
    return this.service.update(id, dto);
  }
}
