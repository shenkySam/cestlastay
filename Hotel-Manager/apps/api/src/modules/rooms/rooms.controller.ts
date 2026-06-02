import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomDto } from './dto/update-room.dto';
import { UpdateRoomStatusDto } from './dto/update-room-status.dto';
import { CreateRoomCategoryDto } from './dto/create-room-category.dto';
import { UpdateRoomCategoryDto } from './dto/update-room-category.dto';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole, RoomStatus } from '@hms/shared';

@Controller('rooms')
export class RoomsController {
  constructor(private readonly service: RoomsService) {}

  // ── Categories ───────────────────────────────────────────────

  @Get('categories')
  findAllCategories() {
    return this.service.findAllCategories();
  }

  @Post('categories')
  @Roles(UserRole.ADMIN)
  createCategory(@Body() dto: CreateRoomCategoryDto) {
    return this.service.createCategory(dto);
  }

  @Patch('categories/:id')
  @Roles(UserRole.ADMIN)
  updateCategory(@Param('id') id: string, @Body() dto: UpdateRoomCategoryDto) {
    return this.service.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @Roles(UserRole.ADMIN)
  deleteCategory(@Param('id') id: string) {
    return this.service.deleteCategory(id);
  }

  // ── Availability check (before :id routes) ───────────────────

  @Get('availability')
  checkAvailability(
    @Query('checkIn') checkIn: string,
    @Query('checkOut') checkOut: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.checkAvailability(
      new Date(checkIn),
      new Date(checkOut),
      categoryId,
    );
  }

  // ── Rooms CRUD ───────────────────────────────────────────────

  @Get()
  findAll(
    @Query('status') status?: RoomStatus,
    @Query('floor') floor?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.service.findAll({
      status,
      floor: floor !== undefined ? Number(floor) : undefined,
      categoryId,
    });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(UserRole.ADMIN)
  create(@Body() dto: CreateRoomDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateRoomDto) {
    return this.service.update(id, dto);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  updateStatus(@Param('id') id: string, @Body() dto: UpdateRoomStatusDto) {
    return this.service.updateStatus(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  delete(@Param('id') id: string) {
    return this.service.delete(id);
  }
}
