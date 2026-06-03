/**
 * Allowed browser origins for CORS — shared by the HTTP server (main.ts) and the
 * Socket.IO gateway (notifications.gateway.ts).
 *
 * In production set CORS_ORIGINS to a comma-separated list of the deployed frontend
 * URLs, e.g.:
 *   CORS_ORIGINS="https://komorebi.example.com,https://admin.example.com"
 * (the landing site AND the admin/web app both call this API).
 *
 * Falls back to FRONTEND_URL and the local dev ports when CORS_ORIGINS is unset.
 */
export function getCorsOrigins(): string[] {
  const fromEnv = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (fromEnv.length > 0) return fromEnv;

  return [
    process.env.FRONTEND_URL, // single-origin / legacy fallback
    'http://localhost:5173', // admin (web) dev
    'http://localhost:5174', // landing (guest) dev
  ].filter((origin): origin is string => Boolean(origin));
}
