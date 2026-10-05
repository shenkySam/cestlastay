// The cestlastay web app owns all authentication. It runs as a separate
// origin (dev: http://localhost:5173); set VITE_PORTAL_URL to its deployed URL
// in production.
const base = import.meta.env.VITE_PORTAL_URL || 'http://localhost:5173';

/**
 * Customer entry point — the cestlastay Guest Portal. Customers sign in with
 * their booking number + last name; the portal also links onward to the staff
 * Google / Apple sign-in (/login).
 */
export const guestPortalUrl = `${base}/guest-portal`;
