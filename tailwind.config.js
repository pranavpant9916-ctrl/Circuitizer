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
        obsidian: {
          DEFAULT: '#000000',
          50: '#ffffff',
          100: '#ebedf2',
          200: '#cfd3dd',
          300: '#a3a9b7',
          400: '#787f8f',
          500: '#525866',
          600: '#353a47',
          700: '#222631',
          800: '#171a22',
          900: '#0d0f14',
          950: '#06070a',
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
