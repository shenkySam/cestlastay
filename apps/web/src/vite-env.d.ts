/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL, including the `/api/v1` prefix. */
  readonly VITE_API_URL?: string;
  /** Socket.IO server origin (no path), e.g. https://api.example.com */
  readonly VITE_SOCKET_URL?: string;
  /** Stripe publishable key (pk_...) for guest payment flows. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
  /** Google OAuth Web client ID — same value as the API's GOOGLE_CLIENT_ID. Unset hides the button. */
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  /** Apple Services ID — same value as the API's APPLE_CLIENT_ID. Unset hides the button. */
  readonly VITE_APPLE_CLIENT_ID?: string;
  /** Return URL registered on the Apple Services ID. Defaults to `<origin>/login`. */
  readonly VITE_APPLE_REDIRECT_URI?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
