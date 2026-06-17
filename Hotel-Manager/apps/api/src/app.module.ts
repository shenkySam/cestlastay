import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { GuestsModule } from './modules/guests/guests.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ServicesModule } from './modules/services/services.module';
import { HousekeepingModule } from './modules/housekeeping/housekeeping.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { CrmModule } from './modules/crm/crm.module';
import { OtaModule } from './modules/ota/ota.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { RatingsModule } from './modules/ratings/ratings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    NotificationsModule,
    RoomsModule,
    GuestsModule,
    BookingsModule,
    ServicesModule,
    HousekeepingModule,
    InvoicesModule,
    PaymentsModule,
    CrmModule,
    OtaModule,
    AnalyticsModule,
    RatingsModule,
  ],
})
export class AppModule {}
