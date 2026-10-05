import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { RatingsService } from './ratings.service';
import { CreateRatingDto } from './dto/create-rating.dto';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@hms/shared';

@Controller('ratings')
export class RatingsController {
  constructor(private readonly service: RatingsService) {}

  /** Guest submits a stay + room rating for their booking */
  @Post()
  @Roles(UserRole.GUEST)
  create(
    @CurrentUser() user: { guest?: { id: string }; bookingStatus?: string },
    @Body() dto: CreateRatingDto,
  ) {
    if (!user.guest?.id) throw new ForbiddenException();
    if (user.bookingStatus === 'CONFIRMED') {
      throw new ForbiddenException('You can rate your stay once it has started');
    }
    // The guest principal from JwtStrategy carries the guests-table ID in guest.id
    return this.service.create(user.guest.id, dto);
  }

  /** Admin: list all ratings with pagination */
  @Get()
  @Roles(UserRole.ADMIN)
  findAll(
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ) {
    return this.service.findAll(Number(page), Number(limit));
  }

  /** Admin: aggregate summary stats */
  @Get('summary')
  @Roles(UserRole.ADMIN)
  getSummary() {
    return this.service.getSummary();
  }

  /** Get rating for a specific booking */
  @Get('booking/:bookingId')
  findByBooking(@Param('bookingId') bookingId: string) {
    return this.service.findByBooking(bookingId);
  }
}
