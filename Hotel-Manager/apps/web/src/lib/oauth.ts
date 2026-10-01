// Browser side of Google / Apple sign-in. Each provider's SDK runs the consent
// popup and hands back an ID token (JWT); the API verifies it at
// POST /auth/google or /auth/apple and returns our own access/refresh tokens.

export type OAuthProvider = 'google' | 'apple';

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';
export const APPLE_CLIENT_ID = import.meta.env.VITE_APPLE_CLIENT_ID ?? '';

// Minimal typings for the two SDK globals we use.
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            ux_mode?: 'popup' | 'redirect';
            auto_select?: boolean;
          }): void;
          renderButton(parent: HTMLElement, options: Record<string, unknown>): void;
        };
      };
    };
    AppleID?: {
      auth: {
        init(config: {
          clientId: string;
          scope: string;
          redirectURI: string;
          usePopup: boolean;
        }): void;
        signIn(): Promise<{ authorization: { id_token: string; code: string } }>;
      };
    };
  }
}

const scripts = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  let p = scripts.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const el = document.createElement('script');
      el.src = src;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scripts.delete(src); // allow a retry on next mount
        reject(new Error(`Failed to load ${src}`));
      };
      document.head.appendChild(el);
    });
    scripts.set(src, p);
  }
  return p;
}

/**
 * Renders Google's own "Sign in with Google" button into `parent` (Google
 * requires its button, served in an iframe). `onCredential` gets the ID token.
 */
export async function renderGoogleButton(
  parent: HTMLElement,
  onCredential: (idToken: string) => void,
) {
  await loadScript('https://accounts.google.com/gsi/client');
  const gis = window.google!.accounts.id;
  gis.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: ({ credential }) => onCredential(credential),
    ux_mode: 'popup',
    auto_select: false,
  });
  parent.replaceChildren(); // StrictMode mounts twice — don't stack two buttons
  gis.renderButton(parent, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'pill',
    logo_alignment: 'center',
    // Google caps the button at 400px; it can't be sized with CSS
    width: Math.min(400, Math.max(200, parent.clientWidth)),
  });
}

/**
 * Opens the Sign in with Apple popup and resolves with the ID token, or null
 * if the user closed the popup. The return URL must be registered on the
 * Services ID in Apple Developer (Apple rejects localhost).
 */
export async function signInWithApple(): Promise<string | null> {
  await loadScript(
    'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js',
  );
  const apple = window.AppleID!.auth;
  apple.init({
    clientId: APPLE_CLIENT_ID,
    scope: 'email',
    redirectURI: import.meta.env.VITE_APPLE_REDIRECT_URI || `${window.location.origin}/login`,
    usePopup: true,
  });
  try {
    const res = await apple.signIn();
    return res.authorization.id_token;
  } catch (err) {
    // The SDK rejects with { error: 'popup_closed_by_user' | 'user_cancelled_authorize' }
    const code = (err as { error?: string })?.error;
    if (code === 'popup_closed_by_user' || code === 'user_cancelled_authorize') return null;
    throw err;
  }
}
