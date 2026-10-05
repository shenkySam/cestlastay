import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@hms/shared';

@Controller('analytics')
@Roles(UserRole.ADMIN)
export class AnalyticsController {
  constructor(private readonly service: AnalyticsService) {}

  @Get('overview')
  overview(@Query('days') days?: string) {
    return this.service.getOverview(this.parseDays(days));
  }

  @Get('revenue-by-day')
  revenueByDay(@Query('days') days?: string) {
    return this.service.getRevenueByDay(this.parseDays(days));
  }

  @Get('occupancy-by-day')
  occupancyByDay(@Query('days') days?: string) {
    return this.service.getOccupancyByDay(this.parseDays(days));
  }

  @Get('bookings-by-source')
  bookingsBySource(@Query('days') days?: string) {
    return this.service.getBookingsBySource(this.parseDays(days));
  }

  @Get('top-rooms')
  topRooms(@Query('days') days?: string, @Query('limit') limit?: string) {
    return this.service.getTopRooms(this.parseDays(days), limit ? Number(limit) : 5);
  }

  private parseDays(days?: string): number {
    const n = days ? Number(days) : 30;
    if (Number.isNaN(n) || n < 1) return 30;
    return Math.min(n, 365);
  }
}
