/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Caveat (handwriting) — brand/display font for titles & headings only.
        // Body text keeps Tailwind's default sans-serif.
        display: ['Caveat', 'ui-sans-serif', 'system-ui', 'cursive'],
        // "Earthen" guest-site type, used on the sign-in page to match apps/guest
        cormorant: ['"Cormorant Garamond"', 'Georgia', 'serif'],
        jost: ['Jost', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        // Admin console ("Lagoon") — Geist for UI, Geist Mono for every number/ID
        geist: ['Geist', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        'geist-mono': ['"Geist Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      boxShadow: {
        // Zinc-tinted diffusion shadows for admin tiles (no glows)
        diffuse: '0 20px 40px -15px rgb(24 24 27 / 0.06)',
        'diffuse-lg': '0 32px 64px -24px rgb(24 24 27 / 0.12)',
        // Guest portal: ink-tinted in light mode, near-black in dark (--g-scrim)
        guest: '0 1px 2px rgb(var(--g-scrim) / 0.05), 0 22px 44px -26px rgb(var(--g-scrim) / 0.3)',
        'guest-lg': '0 2px 6px rgb(var(--g-scrim) / 0.06), 0 36px 64px -28px rgb(var(--g-scrim) / 0.42)',
      },
      keyframes: {
        shimmer: { '100%': { transform: 'translateX(100%)' } },
        breathe: {
          '0%': { transform: 'scale(1)', opacity: '0.55' },
          '70%, 100%': { transform: 'scale(2.4)', opacity: '0' },
        },
        marquee: { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(-50%)' } },
        caret: { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      animation: {
        shimmer: 'shimmer 1.8s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        breathe: 'breathe 2.4s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        marquee: 'marquee 48s linear infinite',
        caret: 'caret 1s steps(1) infinite',
      },
      colors: {
        // Ocean — primary brand (the logo's waves).
        // Structural: buttons, links, nav/active states, dark sidebar chrome.
        primary: {
          50: '#ecfeff',
          100: '#d0f5fb',
          200: '#a6e9f5',
          300: '#6fd6ec',
          400: '#2fbcdc',
          500: '#0ea5c4',
          600: '#0a85a4',
          700: '#0c6a85',
          800: '#11566c',
          900: '#134457',
          950: '#0a2c3a',
        },
        // Sunset — accent (the logo's sky circle).
        // Hero/auth gradient, warm CTAs, highlights.
        accent: {
          50: '#fff8eb',
          100: '#fdecc8',
          200: '#fbd896',
          300: '#f9bf5a',
          400: '#f7a52b',
          500: '#f59e0b',
          600: '#e07b09',
          700: '#ba5a0c',
          800: '#934510',
          900: '#783911',
        },
        // Palm — fresh/success accents (the logo's fronds).
        palm: {
          50: '#f2faea',
          100: '#e0f2cd',
          200: '#c6e6a0',
          300: '#a7d96a',
          400: '#82c43f',
          500: '#5fae28',
          600: '#4a8c20',
          700: '#3a6c1d',
          800: '#2f561c',
          900: '#29481b',
        },
        // Sand — warm neutral (the logo's beach house / brown).
        sand: {
          50: '#faf7f2',
          100: '#f0e7d9',
          200: '#e2d2bb',
          300: '#d0b594',
          400: '#bd956c',
          500: '#a8794e',
          600: '#8b5e34',
          700: '#6f4a28',
          800: '#5c3e24',
          900: '#4e3621',
        },
        // Lagoon — the admin console's single accent: the logo's ocean, desaturated (<80% sat).
        lagoon: {
          50: '#f0f9fa',
          100: '#d9f0f2',
          200: '#b5e1e6',
          300: '#84cbd4',
          400: '#4eacb9',
          500: '#33909e',
          600: '#2a7684',
          700: '#27606c',
          800: '#264f59',
          900: '#23434c',
          950: '#132b32',
        },
        // Earthen — the guest site's palette, used on the sign-in page.
        cream: '#f4efe5',
        ink: '#3a2a1f',
        clay: { DEFAULT: '#b1542e', dark: '#8a3f20' },
        gold: '#c9a23a',
        // Guest portal — the same earthen palette as RGB channels in --g-*
        // variables (globals.css), so it has a dark variant and keeps alpha
        // modifiers (bg-guest-ink/5). One accent: clay.
        guest: {
          canvas: 'rgb(var(--g-canvas) / <alpha-value>)',
          surface: 'rgb(var(--g-surface) / <alpha-value>)',
          raised: 'rgb(var(--g-raised) / <alpha-value>)',
          ink: 'rgb(var(--g-ink) / <alpha-value>)',
          muted: 'rgb(var(--g-muted) / <alpha-value>)',
          clay: 'rgb(var(--g-clay) / <alpha-value>)',
          'on-clay': 'rgb(var(--g-on-clay) / <alpha-value>)',
          gold: 'rgb(var(--g-gold) / <alpha-value>)',
          palm: 'rgb(var(--g-palm) / <alpha-value>)',
          danger: 'rgb(var(--g-danger) / <alpha-value>)',
          scrim: 'rgb(var(--g-scrim) / <alpha-value>)',
        },
      },
    },
  },
  plugins: [],
};
