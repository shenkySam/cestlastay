import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Axios instance with cookie-based auth (CR-3 fix).
 *
 * Access and refresh tokens are stored in HttpOnly cookies set by the server.
 * The browser sends them automatically on every same-origin request.
 * We no longer read tokens from localStorage or attach Authorization headers.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // send cookies on every request
});

// Silent token refresh: when a request gets a 401, try POST /auth/refresh
// (the refresh cookie is sent automatically), then replay the original request.
let isRefreshing = false;
let failedQueue: Array<{ resolve: () => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve()));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: () => resolve(api(original)),
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        // Refresh token lives in an HttpOnly cookie -- no body payload needed.
        await axios.post('/api/v1/auth/refresh', {}, { withCredentials: true });
        processQueue(null);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError);
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Show error toast -- skip 401 (handled above) and 404 (expected for optional resources)
    const status = error.response?.status;
    if (status && status !== 401 && status !== 404) {
      const message = error.response?.data?.message || 'An error occurred';
      toast.error(Array.isArray(message) ? message[0] : message);
    }

    return Promise.reject(error);
  },
);

export default api;
