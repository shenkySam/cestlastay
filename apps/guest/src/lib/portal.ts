// The cestlastay web app owns all authentication. It runs as a separate
// origin (dev: http://localhost:5173); set VITE_PORTAL_URL to its deployed URL
// in production.
const base = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173';

/**
 * Customer entry point — guest sign-in on the cestlastay app. Guests sign in
 * with Google (the email they booked with) or booking number + last name; the
 * same page has a Staff side for Google / Apple staff sign-in.
 */
export const guestPortalUrl = `${base}/login?as=guest`;
