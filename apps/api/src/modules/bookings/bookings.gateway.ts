import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from '../notifications/notifications.gateway';

// Thin wrapper — delegates to the single NotificationsGateway
@Injectable()
export class BookingsGateway {
  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  emitCheckedIn(booking: any) {
    this.notificationsGateway.emitCheckedIn(booking);
  }

  emitCheckedOut(booking: any) {
    this.notificationsGateway.emitCheckedOut(booking);
  }
}
