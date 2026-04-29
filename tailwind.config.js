/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: '#0d9488',
          dark: '#0f766e',
          light: '#5eead4',
        },
        navy: {
          DEFAULT: '#0a0f1a',
          mid: '#1a2540',
        }
      },
      fontFamily: {
        display: ['DM Serif Display', 'Georgia', 'serif'],
        body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      }
    }
  },
  plugins: []
}
