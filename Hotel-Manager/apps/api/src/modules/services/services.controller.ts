import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateServiceRequestDto } from './dto/create-service-request.dto';
import { UpdateServiceRequestDto } from './dto/update-service-request.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, ServiceStatus, ServiceType } from '@hms/shared';

@Controller('services')
export class ServicesController {
  constructor(private readonly service: ServicesService) {}

  @Get()
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findAll(
    @Query('status') status?: ServiceStatus,
    @Query('type') type?: ServiceType,
    @Query('guestId') guestId?: string,
  ) {
    return this.service.findAll({ status, type, guestId });
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  // Guests and staff can create service requests
  @Post()
  create(@Body() dto: CreateServiceRequestDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  update(@Param('id') id: string, @Body() dto: UpdateServiceRequestDto) {
    return this.service.update(id, dto);
  }
}
