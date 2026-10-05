import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Server, Socket } from 'socket.io';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtPayload } from '../auth/strategies/jwt.strategy';
import { getCorsOrigins } from '../../common/cors';

/** Room every authenticated staff/admin socket joins. Hotel-wide events go here. */
export const STAFF_ROOM = 'staff';

interface SocketPrincipal {
  /** userId for staff/admin tokens, guestId for guest-portal tokens. */
  id: string;
  role: string;
  isStaff: boolean;
  bookingId?: string;
}

@WebSocketGateway({
  cors: { origin: getCorsOrigins(), credentials: true },
  namespace: '/',
})
export class NotificationsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(NotificationsGateway.name);

  // userId → Set of socket IDs
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    if (!this.config.get<string>('JWT_SECRET')) {
      this.logger.error('JWT_SECRET is not set — every socket handshake will be rejected');
    }

    // Authenticate during the handshake rather than in handleConnection: Nest never
    // binds message handlers for a rejected client (so nothing can race a 'subscribe'
    // in), and the client sees connect_error → socket.active === false → it stops
    // retrying, instead of the reconnect storm a post-connect disconnect() causes.
    server.use(async (client: Socket, next: (err?: Error) => void) => {
      try {
        client.data.principal = await this.authenticate(client);
        next();
      } catch (err) {
        this.logger.warn(`WS handshake rejected (${client.id}): ${(err as Error).message}`);
        next(new Error('UNAUTHORIZED'));
      }
    });
  }

  /** Mirrors JwtStrategy.validate() so WebSocket access matches HTTP access. */
  private async authenticate(client: Socket): Promise<SocketPrincipal> {
    const token = this.extractToken(client);
    if (!token) throw new Error('missing token');

    const payload = await this.jwt.verifyAsync<JwtPayload>(token, {
      secret: this.config.get<string>('JWT_SECRET'),
    });

    // Guest portal tokens carry sub = guestId (guests table), not a userId.
    if (payload.role === 'GUEST') {
      if (!payload.bookingId) throw new Error('guest token without bookingId');
      const guest = await this.prisma.guest.findUnique({
        where: { id: payload.sub },
        select: { id: true },
      });
      if (!guest) throw new Error('unknown guest');
      return { id: guest.id, role: 'GUEST', isStaff: false, bookingId: payload.bookingId };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, status: true },
    });
    if (!user || user.status !== 'ACTIVE') throw new Error('inactive or unknown user');

    return {
      id: user.id,
      role: user.role,
      isStaff: user.role === 'ADMIN' || user.role === 'STAFF',
    };
  }

  private extractToken(client: Socket): string | null {
    const auth = client.handshake.auth as { token?: string } | undefined;
    if (auth?.token) return auth.token.replace(/^Bearer\s+/i, '');

    const header = client.handshake.headers?.authorization;
    if (typeof header === 'string' && /^bearer /i.test(header)) return header.slice(7);

    const query = client.handshake.query?.token;
    return typeof query === 'string' && query ? query : null;
  }

  handleConnection(client: Socket) {
    const principal = client.data.principal as SocketPrincipal | undefined;
    if (!principal) {
      // Defensive: the handshake middleware should have rejected this already.
      client.disconnect(true);
      return;
    }

    // Guests join nothing: their sub is a guestId, so `user:<id>` would be the wrong
    // room, and hotel-wide events are staff business.
    if (principal.isStaff) {
      client.join(STAFF_ROOM);
      this.joinUserRoom(client, principal.id);
    }
  }

  handleDisconnect(client: Socket) {
    // Remove from all user rooms
    this.userSockets.forEach((sockets, userId) => {
      sockets.delete(client.id);
      if (sockets.size === 0) this.userSockets.delete(userId);
    });
  }

  /**
   * Kept for backwards compatibility with the existing client, which still sends
   * { userId } — that value is ignored. Rooms are derived from the verified token
   * only, and the join is idempotent with the one done at connect time.
   */
  @SubscribeMessage('subscribe')
  handleSubscribe(@MessageBody() _data: { userId?: string }, @ConnectedSocket() client: Socket) {
    const principal = client.data.principal as SocketPrincipal | undefined;
    if (!principal?.isStaff) return;
    this.joinUserRoom(client, principal.id);
  }

  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@MessageBody() _data: { userId?: string }, @ConnectedSocket() client: Socket) {
    const principal = client.data.principal as SocketPrincipal | undefined;
    if (!principal) return;
    client.leave(`user:${principal.id}`);
    this.userSockets.get(principal.id)?.delete(client.id);
  }

  private joinUserRoom(client: Socket, userId: string) {
    if (!this.userSockets.has(userId)) this.userSockets.set(userId, new Set());
    this.userSockets.get(userId)!.add(client.id);
    client.join(`user:${userId}`);
  }

  sendToUser(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification:new', notification);
  }

  // Also keep room-level broadcast methods here so a single gateway handles everything.
  // These are staff-scoped: the booking payloads carry guest PII, and the only
  // consumers are staff/admin-gated pages.
  emitRoomStatusChanged(room: any) {
    this.server.to(STAFF_ROOM).emit('room:status-changed', room);
  }

  emitCheckedIn(booking: any) {
    this.server.to(STAFF_ROOM).emit('booking:checked-in', booking);
  }

  emitCheckedOut(booking: any) {
    this.server.to(STAFF_ROOM).emit('booking:checked-out', booking);
  }
}
