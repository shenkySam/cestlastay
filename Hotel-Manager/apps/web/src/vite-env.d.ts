/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** API base URL, including the `/api/v1` prefix. */
  readonly VITE_API_URL?: string;
  /** Socket.IO server origin (no path), e.g. https://api.example.com */
  readonly VITE_SOCKET_URL?: string;
  /** Stripe publishable key (pk_...) for guest payment flows. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
