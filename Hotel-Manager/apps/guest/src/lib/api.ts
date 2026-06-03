import axios from 'axios';

/**
 * Axios instance for the (future) public endpoints on the Hotel-Manager API.
 * Mirrors the internal app's client shape, minus the JWT/refresh interceptors —
 * the landing page only ever calls public, unauthenticated routes.
 *
 * NOTE: these calls only fire when VITE_ENABLE_BOOKING_API === 'true'. Until the
 * backend exposes public routes + widens CORS to this origin, leave the flag off.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 12000,
});

export default api;
