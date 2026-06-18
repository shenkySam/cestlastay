import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;

/**
 * Return (or create) the shared Socket.IO connection.
 * Auth tokens are now HttpOnly cookies -- withCredentials sends them automatically
 * during the HTTP upgrade handshake so the server can validate them.
 */
export function getSocket(): Socket {
  if (!socket || !socket.connected) {
    socket = io(SOCKET_URL, {
      withCredentials: true, // sends auth cookies on the upgrade handshake
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
