import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { getCorsOrigins } from '../../common/cors';

@WebSocketGateway({
  cors: { origin: getCorsOrigins(), credentials: true },
  namespace: '/',
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // userId → Set of socket IDs
  private userSockets = new Map<string, Set<string>>();

  handleConnection(client: Socket) {
    console.log(`WS connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`WS disconnected: ${client.id}`);
    // Remove from all user rooms
    this.userSockets.forEach((sockets, userId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(userId);
    });
  }

  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    const { userId } = data;
    if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
    this.userSockets.get(userId)!.add(client.id);
    client.join(`user:${userId}`);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@MessageBody() data: { userId: string }, @ConnectedSocket() client: Socket) {
    client.leave(`user:${data.userId}`);
    this.userSockets.get(data.userId)?.delete(client.id);
  }

  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  // Also keep room-level broadcast methods here so a single gateway handles everything
  emitRoomStatusChanged(room: any) {
    this.server.emit('room:status-changed', room);
  }

  emitCheckedIn(booking: any) {
    this.server.emit('booking:checked-in', booking);
  }

  emitCheckedOut(booking: any) {
    this.server.emit('booking:checked-out', booking);
  }
}
