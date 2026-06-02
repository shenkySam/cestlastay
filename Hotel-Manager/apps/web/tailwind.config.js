/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Caveat (handwriting) — brand/display font for titles & headings only.
        // Body text keeps Tailwind's default sans-serif.
        display: ['Caveat', 'ui-sans-serif', 'system-ui', 'cursive'],
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
      },
      keyframes: {
        authfade: { '0%, 40%': { opacity: '0' }, '60%, 100%': { opacity: '1' } },
      },
      animation: {
        // long, gentle, ping-pong crossfade between the two login photos
        authfade: 'authfade 9s ease-in-out infinite alternate',
      },
    },
  },
  plugins: [],
};
