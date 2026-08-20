/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Anton', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        // Theme-aware tokens (see index.css for the light/dark CSS var
        // values). Use these instead of hardcoded bg-[#14110F] / bg-white/N
        // for anything that should flip between light and dark mode.
        canvas: 'rgb(var(--canvas-rgb) / <alpha-value>)',
        surface: 'rgb(var(--surface-rgb) / <alpha-value>)',
        surface2: 'rgb(var(--surface2-rgb) / <alpha-value>)',
        line: 'rgb(var(--line-rgb) / <alpha-value>)',
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',
        tint: 'rgb(var(--tint-rgb) / <alpha-value>)',
      },
    },
  },
  plugins: [],
};
