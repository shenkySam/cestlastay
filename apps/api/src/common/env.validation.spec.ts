import { validateEnv } from './env.validation';

const ok = {
  DATABASE_URL: 'postgresql://localhost/db',
  JWT_SECRET: 'a'.repeat(32),
  JWT_REFRESH_SECRET: 'b'.repeat(32),
};

describe('validateEnv', () => {
  it('accepts a complete config', () => {
    expect(validateEnv(ok)).toBe(ok);
  });

  it('requires JWT_REFRESH_SECRET', () => {
    expect(() => validateEnv({ ...ok, JWT_REFRESH_SECRET: undefined })).toThrow(
      /JWT_REFRESH_SECRET is required/,
    );
  });

  it('rejects short secrets', () => {
    expect(() => validateEnv({ ...ok, JWT_SECRET: 'short' })).toThrow(/at least 32/);
  });

  it('rejects the .env.example placeholders', () => {
    expect(() =>
      validateEnv({ ...ok, JWT_SECRET: 'change-me-min-32-chars-random-string' }),
    ).toThrow(/placeholder/);
  });

  it('rejects identical access and refresh secrets', () => {
    expect(() => validateEnv({ ...ok, JWT_REFRESH_SECRET: ok.JWT_SECRET })).toThrow(/different/);
  });

  it('requires DATABASE_URL', () => {
    expect(() => validateEnv({ ...ok, DATABASE_URL: '' })).toThrow(/DATABASE_URL/);
  });
});
