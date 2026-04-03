/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0e0e10',
          secondary: '#19191c',
          tertiary: '#1f1f22',
        },
        accent: '#e60000',
        text: {
          primary: '#ffffff',
          secondary: '#adaaad',
        },
      },
      fontFamily: {
        main: ['Space Grotesk', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
