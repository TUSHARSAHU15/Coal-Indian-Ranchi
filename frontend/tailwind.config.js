/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ccl: {
          dark: '#002244',
          primary: '#003366',
          light: '#004c99',
          gold: '#d4af37',
          accent: '#0284c7'
        }
      }
    },
  },
  plugins: [],
}
