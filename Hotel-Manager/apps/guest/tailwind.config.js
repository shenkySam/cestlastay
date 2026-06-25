/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ─────────────────────────────────────────────────────────────
      //  C'EST LA STAY — EARTHEN PALETTE  ·  ⇩ CHANGE BRAND HEX HERE ⇩
      //  LIGHT / cream Earthen theme: warm cream page, dark clay text,
      //  red-laterite clay + Matrimandir gold accents. Token NAMES are
      //  kept so components keep working — only the hues changed.
      // ─────────────────────────────────────────────────────────────
      colors: {
        // "ocean" slot → MATRIMANDIR GOLD. Secondary CTAs / links / accents.
        ocean: {
          50: '#fbf7ea', 100: '#f5ead0', 200: '#ead29a', 300: '#ddb866',
          400: '#cfa23f', 500: '#bf9132', 600: '#a2792a', 700: '#826024',
          800: '#6b4f22', 900: '#5a431f', 950: '#34260f',
        },
        // "sunset" slot → TERRACOTTA / CLAY. Primary CTAs / energy / highlights.
        sunset: {
          50: '#fbf3ee', 100: '#f6e1d6', 200: '#ecc3ad', 300: '#e09e7d',
          400: '#cf7551', 500: '#b1542e', 600: '#9a4527', 700: '#7e3720',
          800: '#662e1d', 900: '#54281b',
        },
        // Palm — the Auroville forest. Nature / success / ticks.
        palm: {
          50: '#f2faea', 100: '#e0f2cd', 200: '#c6e6a0', 300: '#a7d96a',
          400: '#82c43f', 500: '#5fae28', 600: '#4a8c20', 700: '#3a6c1d',
          800: '#2f561c', 900: '#29481b',
        },
        // Sand — warm laterite earth. Surfaces + neutrals.
        sand: {
          50: '#faf7f1', 100: '#f3ebdd', 200: '#e6d6bd', 300: '#d4ba93',
          400: '#c19a6b', 500: '#a8794e', 600: '#8b5e34', 700: '#6f4a28',
          800: '#5c3e24', 900: '#4e3621',
        },

        // LIGHT theme: cream page, dark clay foreground text.
        base: '#f4efe5',    // cream page base
        surface: '#fbf8f1', // warm off-white card surface
        ink: '#3a2a1f',     // primary foreground — deep clay-brown
        muted: '#6b5849',   // secondary foreground — warm mid-brown
      },
      // Hairline divider colour exposed as --hairline in globals.css.

      fontFamily: {
        // ⇩ SWAP FONTS HERE (also update the <link> in index.html) ⇩
        serif: ['"Cormorant Garamond"', 'Georgia', 'Cambria', 'serif'], // display / headings — editorial
        sans: ['"Jost"', 'ui-sans-serif', 'system-ui', 'sans-serif'], // body / UI — warm geometric
        script: ['Caveat', 'ui-sans-serif', 'cursive'], // logo wordmark — handwriting
      },

      borderRadius: { token: '6px', card: '24px' },

      boxShadow: {
        // Layered, diffuse shadows — soft warm daylight
        soft: '0 1px 2px rgba(58,42,31,0.05), 0 18px 40px -22px rgba(58,42,31,0.22)',
        lift: '0 2px 8px rgba(58,42,31,0.10), 0 40px 64px -30px rgba(150,90,40,0.30)',
      },

      letterSpacing: { eyebrow: '0.26em' },

      transitionTimingFunction: {
        breath: 'cubic-bezier(0.22, 1, 0.36, 1)', // organic, liquid easing
      },

      keyframes: {
        kenburns: {
          '0%': { transform: 'scale(1) translate3d(0,0,0)' },
          '100%': { transform: 'scale(1.12) translate3d(0,-1.5%,0)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        scrollcue: {
          '0%': { transform: 'translateY(0)', opacity: '0.9' },
          '50%': { transform: 'translateY(8px)', opacity: '0.3' },
          '100%': { transform: 'translateY(0)', opacity: '0.9' },
        },
        wave: {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        sway: {
          '0%, 100%': { transform: 'rotate(-1.5deg)' },
          '50%': { transform: 'rotate(1.5deg)' },
        },
      },
      animation: {
        kenburns: 'kenburns 24s ease-out forwards',
        floaty: 'floaty 6s ease-in-out infinite',
        scrollcue: 'scrollcue 2.4s ease-in-out infinite',
        wave: 'wave 16s linear infinite',
        'wave-slow': 'wave 26s linear infinite',
        sway: 'sway 7s ease-in-out infinite',
        marquee: 'wave 42s linear infinite',
      },
    },
  },
  plugins: [],
};
