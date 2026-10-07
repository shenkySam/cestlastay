import axios, { type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';
import toast from 'react-hot-toast';

// Short-lived GET cache. The API is a long round trip away, so going back to a
// page you just left reuses what it loaded instead of fetching it all again.
// Anything that may change the data clears the whole cache: every write sent
// from this tab (POST/PATCH/PUT/DELETE) and every live socket event
// (lib/socket.ts). Errors are never cached.
const FRESH_MS = 30_000;
const network = axios.getAdapter(axios.defaults.adapter);
const fresh = new Map<string, { at: number; res: AxiosResponse }>();
// Bumped by every clear, so a GET still in flight when the data changed
// doesn't store what it read.
let generation = 0;

export function clearApiCache() {
  fresh.clear();
  generation += 1;
}

async function cachingAdapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  if (config.method !== 'get') {
    try {
      return await network(config);
    } finally {
      clearApiCache();
    }
  }

  const key = `${config.headers.Authorization ?? ''} ${api.getUri(config)}`;
  const hit = fresh.get(key);
  // Always hand out copies: axios parses the raw body into `data` on the
  // response object it receives, and the cached one must stay raw.
  if (hit && Date.now() - hit.at < FRESH_MS) return { ...hit.res, config };

  const startedAt = generation;
  const res = await network(config);
  if (startedAt === generation) fresh.set(key, { at: Date.now(), res: { ...res } });
  return res;
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  adapter: cachingAdapter,
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle token expiry: refresh silently, then retry
let isRefreshing = false;
let failedQueue: Array<{ resolve: (v: string) => void; reject: (e: unknown) => void }> = [];

const processQueue = (error: unknown, token: string | null) => {
  failedQueue.forEach((p) => (error ? p.reject(error) : p.resolve(token!)));
  failedQueue = [];
};

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;

    // Sign-in calls: LoginPage shows the error inline (including 429 "too many
    // attempts"). A 401/404 here means "no such account / booking", not an
    // expired session — don't refresh/redirect or toast.
    if (/^\/auth\/(google|apple|guest-portal|guest\/google)$/.test(original?.url ?? '')) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry) {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token) => {
              original.headers.Authorization = `Bearer ${token}`;
              resolve(api(original));
            },
            reject,
          });
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
        localStorage.setItem('accessToken', data.accessToken);
        api.defaults.headers.common.Authorization = `Bearer ${data.accessToken}`;
        processQueue(null, data.accessToken);
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        window.dispatchEvent(new Event('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Show error toast — skip 401 (handled above) and 404 (expected for unbuilt endpoints)
    const status = error.response?.status;
    if (status && status !== 401 && status !== 404) {
      const message = error.response?.data?.message || 'An error occurred';
      toast.error(Array.isArray(message) ? message[0] : message);
    }

    return Promise.reject(error);
  },
);

export default api;
