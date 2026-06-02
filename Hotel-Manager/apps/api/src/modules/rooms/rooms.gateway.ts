import { Injectable } from '@nestjs/common';
import { NotificationsGateway } from '../notifications/notifications.gateway';

// Thin wrapper — delegates to the single NotificationsGateway
@Injectable()
export class RoomsGateway {
  constructor(private readonly notificationsGateway: NotificationsGateway) {}

  emitRoomStatusChanged(room: any) {
    this.notificationsGateway.emitRoomStatusChanged(room);
  }
}
