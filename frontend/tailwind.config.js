/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        diamond: '#00d4ff',
        gold: '#ffd700',
        dark: {
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a24',
        }
      }
    },
  },
  plugins: [],
}
