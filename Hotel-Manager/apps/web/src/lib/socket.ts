import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

let socket: Socket | null = null;
let authRetryTimer: ReturnType<typeof setTimeout> | null = null;
let authRetryDelay = 2000;

const MIN_AUTH_RETRY_DELAY = 2000;
const MAX_AUTH_RETRY_DELAY = 30000;

export function getSocket(fallbackToken?: string): Socket {
  if (socket) return socket;

  socket = io(SOCKET_URL, {
    // Function form: socket.io calls this before EVERY (re)connection attempt, so a
    // token refreshed by api.ts — which writes localStorage but never updates
    // AuthContext state — is picked up without rebuilding the socket.
    auth: (cb: (data: { token: string | null }) => void) =>
      cb({ token: localStorage.getItem('accessToken') ?? fallbackToken ?? null }),
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 2000,
  });

  socket.on('connect_error', () => {
    // Transport failures keep socket.active === true and self-heal. A handshake
    // the server rejected arrives as CONNECT_ERROR → socket.active === false →
    // socket.io never retries on its own, so re-arm it with a fresh token.
    if (!socket || socket.active) return;
    if (!localStorage.getItem('accessToken')) return; // logged out — stay down
    if (authRetryTimer) return; // one pending retry at a time

    authRetryTimer = setTimeout(() => {
      authRetryTimer = null;
      authRetryDelay = Math.min(authRetryDelay * 2, MAX_AUTH_RETRY_DELAY);
      if (socket && !socket.connected) socket.connect();
    }, authRetryDelay);
  });

  return socket;
}

export function disconnectSocket() {
  if (authRetryTimer) {
    clearTimeout(authRetryTimer);
    authRetryTimer = null;
  }
  authRetryDelay = MIN_AUTH_RETRY_DELAY;
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
