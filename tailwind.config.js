/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Bookerly', 'Literata', 'Georgia', 'Cambria', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Direct palette from design reference
        palette: {
          navy: {
            DEFAULT: '#2F4156',
            dark: '#1b2735',
            darker: '#131d27',
            light: '#3e546e',
          },
          teal: {
            DEFAULT: '#567C8D',
            dark: '#3f5d6a',
            light: '#6f96a7',
          },
          sky: {
            DEFAULT: '#C8D9E6',
            dark: '#a8c2d5',
            light: '#e1ecf4',
          },
          beige: {
            DEFAULT: '#F5EFEB',
            dark: '#e8ded7',
            light: '#faf7f5',
          },
          white: '#FFFFFF',
        },
        // Mapped scale harmonized to Navy, Teal, Sky Blue, Beige, and White
        obsidian: {
          DEFAULT: '#131d27',
          50: '#FFFFFF',      // White
          100: '#F5EFEB',     // Beige
          200: '#C8D9E6',     // Sky Blue
          300: '#a8c2d5',     // Soft Sky Blue
          400: '#6f96a7',     // Light Teal
          500: '#567C8D',     // Teal
          600: '#3f5d6a',     // Dark Teal
          700: '#3e546e',     // Light Navy
          800: '#2F4156',     // Core Navy
          900: '#1b2735',     // Dark Navy (cards & drawers)
          950: '#131d27',     // Deepest Navy (canvas & background)
        },
      },
      borderRadius: {
        'g2-sm': '14px',
        'g2': '20px',
        'g2-lg': '28px',
        'g2-xl': '36px',
      },
    },
  },
  plugins: [],
}
