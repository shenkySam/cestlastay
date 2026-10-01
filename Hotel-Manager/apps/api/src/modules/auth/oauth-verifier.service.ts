import {
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify, JWTPayload } from 'jose';

export type OAuthProvider = 'google' | 'apple';

export interface VerifiedIdentity {
  provider: OAuthProvider;
  /** Provider's stable user ID (`sub`) — never changes for this user + app. */
  subject: string;
  email: string | null;
  emailVerified: boolean;
}

const PROVIDERS = {
  google: {
    label: 'Google',
    jwksUrl: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    // OAuth 2.0 Web client ID from Google Cloud Console (…apps.googleusercontent.com)
    clientIdEnv: 'GOOGLE_CLIENT_ID',
  },
  apple: {
    label: 'Apple',
    jwksUrl: 'https://appleid.apple.com/auth/keys',
    issuers: ['https://appleid.apple.com'],
    // Services ID from Apple Developer (e.g. com.cestlastay.signin)
    clientIdEnv: 'APPLE_CLIENT_ID',
  },
} as const;

/**
 * Verifies ID tokens issued by Google / Apple to the browser: signature against
 * the provider's published keys, issuer, audience (our client ID) and expiry.
 */
@Injectable()
export class OAuthVerifierService {
  private readonly logger = new Logger(OAuthVerifierService.name);

  // jose caches the key sets and refetches when it sees an unknown `kid` (key rotation)
  private readonly jwks = {
    google: createRemoteJWKSet(new URL(PROVIDERS.google.jwksUrl)),
    apple: createRemoteJWKSet(new URL(PROVIDERS.apple.jwksUrl)),
  };

  constructor(private readonly config: ConfigService) {}

  async verify(provider: OAuthProvider, idToken: string): Promise<VerifiedIdentity> {
    const p = PROVIDERS[provider];
    // Comma-separated so a future native app's client ID can be accepted too
    const audience = (this.config.get<string>(p.clientIdEnv) ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!audience.length) {
      throw new ServiceUnavailableException(`${p.label} sign-in is not configured`);
    }

    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(idToken, this.jwks[provider], {
        issuer: [...p.issuers],
        audience,
        algorithms: ['RS256'],
      }));
    } catch (err) {
      this.logger.warn(`${p.label} ID token rejected: ${(err as Error).message}`);
      throw new UnauthorizedException(`${p.label} sign-in failed — please try again`);
    }

    if (!payload.sub) throw new UnauthorizedException(`${p.label} sign-in failed — please try again`);

    return {
      provider,
      subject: payload.sub,
      email: typeof payload.email === 'string' ? payload.email.toLowerCase() : null,
      // Google sends a boolean; Apple sends either a boolean or the string "true"
      emailVerified: payload.email_verified === true || payload.email_verified === 'true',
    };
  }
}
