// Staff/admin users as JwtStrategy loads them, kept briefly in memory. Every
// authenticated request needs this lookup and the database is a long round trip
// away, so reusing it saves one trip per request. UsersService calls
// forgetPrincipal after changing a user's role, status or profile, so access
// changes still apply on their next request; the TTL only bounds edits made
// outside the API.
//
// In-process: right for the single API instance. With more replicas, a change
// made through one would take up to TTL_MS to reach the others.

const TTL_MS = 60_000;

const entries = new Map<string, { principal: unknown; expires: number }>();

// Bumped by every forget. A lookup that was already in flight when the user
// changed must not cache what it read, or it would put the old role back.
const versions = new Map<string, number>();

export function principalVersion(userId: string): number {
  return versions.get(userId) ?? 0;
}

export function getCachedPrincipal<T>(userId: string): T | undefined {
  const hit = entries.get(userId);
  if (!hit) return undefined;
  if (hit.expires <= Date.now()) {
    entries.delete(userId);
    return undefined;
  }
  return hit.principal as T;
}

/** `version` is principalVersion(userId) from before the lookup started. */
export function cachePrincipal(userId: string, principal: unknown, version: number): void {
  if (principalVersion(userId) !== version) return;
  entries.set(userId, { principal, expires: Date.now() + TTL_MS });
}

/** Call after the change is committed. */
export function forgetPrincipal(userId: string): void {
  entries.delete(userId);
  versions.set(userId, principalVersion(userId) + 1);
}
