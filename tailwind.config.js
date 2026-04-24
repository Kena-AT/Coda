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
          primary: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          tertiary: 'var(--bg-tertiary)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          secondary: 'var(--accent-secondary)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
        },
      },
      letterSpacing: {
        tightest: '-0.06em',
        tight: '-0.04em',
        premium: '-0.015em',
        header: '-0.03em',
      },
      fontFamily: {
        main: ['Space Grotesk', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
