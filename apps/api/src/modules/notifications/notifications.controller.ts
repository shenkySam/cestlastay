import { Controller, Get, Patch, Param, Query } from '@nestjs/common';
import { UserRole } from '@hms/shared';
import { NotificationsService } from './notifications.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';

// Notifications belong to users (users.id). Guest principals carry a guests.id,
// so guests have none and are kept out entirely.
@Controller('notifications')
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  findAll(
    @CurrentUser() user: { id: string },
    @Query('status') status?: 'UNREAD' | 'READ',
  ) {
    return this.service.findForUser(user.id, status);
  }

  @Patch('read-all')
  markAllRead(@CurrentUser() user: { id: string }) {
    return this.service.markAllRead(user.id);
  }

  @Patch(':id/read')
  markRead(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.service.markRead(id, user.id);
  }
}
