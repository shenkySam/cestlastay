/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // ─────────────────────────────────────────────────────────────
      //  C'EST LA STAY — TROPICAL PALETTE  ·  ⇩ CHANGE BRAND HEX HERE ⇩
      //  Pulled straight from the logo: ocean waves, sunset sky,
      //  palm fronds, and the warm sand of the beach house.
      // ─────────────────────────────────────────────────────────────
      colors: {
        // Ocean — the logo's blue waves. Trust / water / secondary CTAs.
        ocean: {
          50: '#ecfeff', 100: '#d0f5fb', 200: '#a6e9f5', 300: '#6fd6ec',
          400: '#2fbcdc', 500: '#0ea5c4', 600: '#0a85a4', 700: '#0c6a85',
          800: '#11566c', 900: '#134457', 950: '#0a2c3a',
        },
        // Sunset — the logo's yellow→orange sky. Primary CTAs / energy / highlights.
        sunset: {
          50: '#fff8eb', 100: '#fdecc8', 200: '#fbd896', 300: '#f9bf5a',
          400: '#f7a52b', 500: '#f59e0b', 600: '#e07b09', 700: '#ba5a0c',
          800: '#934510', 900: '#783911',
        },
        // Palm — the logo's green fronds. Nature / success / ticks.
        palm: {
          50: '#f2faea', 100: '#e0f2cd', 200: '#c6e6a0', 300: '#a7d96a',
          400: '#82c43f', 500: '#5fae28', 600: '#4a8c20', 700: '#3a6c1d',
          800: '#2f561c', 900: '#29481b',
        },
        // Sand — the logo's beach-house warmth. Page + surfaces + neutrals.
        sand: {
          50: '#faf7f1', 100: '#f3ebdd', 200: '#e6d6bd', 300: '#d4ba93',
          400: '#c19a6b', 500: '#a8794e', 600: '#8b5e34', 700: '#6f4a28',
          800: '#5c3e24', 900: '#4e3621',
        },

        // Immersive dark theme: "ink" is the light FOREGROUND, not dark text.
        base: '#06121a',    // deep ocean-black page base
        surface: '#0e2029', // dark glass fallback (cards use translucent .card)
        ink: '#eef2ef',     // primary foreground — soft white
        muted: '#b7c4c4',   // secondary foreground — legible cool light
      },
      // Hairline divider colour exposed as --hairline in globals.css.

      fontFamily: {
        // ⇩ SWAP FONTS HERE (also update the <link> in index.html) ⇩
        serif: ['Fraunces', 'Georgia', 'Cambria', 'serif'], // display / headings — editorial
        sans: ['"Hanken Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'], // body / UI — warm humanist
        script: ['Caveat', 'ui-sans-serif', 'cursive'], // logo wordmark — handwriting
      },

      borderRadius: { token: '6px', card: '8px' },

      boxShadow: {
        // Layered, diffuse shadows — soft tropical daylight
        soft: '0 1px 2px rgba(42,35,29,0.05), 0 18px 40px -22px rgba(42,35,29,0.20)',
        lift: '0 2px 8px rgba(42,35,29,0.08), 0 40px 64px -30px rgba(12,106,133,0.28)',
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
