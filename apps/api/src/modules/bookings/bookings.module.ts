import { Module } from '@nestjs/common';
import { BookingsController } from './bookings.controller';
import { BookingsService } from './bookings.service';
import { BookingsGateway } from './bookings.gateway';
import { NotificationsModule } from '../notifications/notifications.module';
import { CrmModule } from '../crm/crm.module';
import { GuestsModule } from '../guests/guests.module';
import { RoomsModule } from '../rooms/rooms.module';
import { GuestOtpModule } from '../auth/guest-otp.module';

@Module({
  imports: [NotificationsModule, CrmModule, GuestsModule, RoomsModule, GuestOtpModule],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsGateway],
  exports: [BookingsService],
})
export class BookingsModule {}
