/**
 * Boot-time checks for the env vars the API can't run safely without. Passed
 * to ConfigModule.forRoot({ validate }), so a bad deploy fails at startup with
 * a clear message instead of failing (or silently weakening auth) later.
 */
const MIN_SECRET_LENGTH = 32;

export function validateEnv(env: Record<string, unknown>): Record<string, unknown> {
  const errors: string[] = [];
  const str = (key: string) => (typeof env[key] === 'string' ? (env[key] as string).trim() : '');

  if (!str('DATABASE_URL')) errors.push('DATABASE_URL is required');

  for (const key of ['JWT_SECRET', 'JWT_REFRESH_SECRET']) {
    const value = str(key);
    if (!value) errors.push(`${key} is required`);
    else if (value.startsWith('change-me')) {
      errors.push(`${key} is still the placeholder from .env.example`);
    } else if (value.length < MIN_SECRET_LENGTH) {
      errors.push(`${key} must be at least ${MIN_SECRET_LENGTH} characters`);
    }
  }
  // Same secret would make access and refresh tokens verify against each other.
  if (str('JWT_SECRET') && str('JWT_SECRET') === str('JWT_REFRESH_SECRET')) {
    errors.push('JWT_SECRET and JWT_REFRESH_SECRET must be different');
  }

  if (errors.length) {
    throw new Error(`Invalid environment configuration:\n  - ${errors.join('\n  - ')}`);
  }
  return env;
}
