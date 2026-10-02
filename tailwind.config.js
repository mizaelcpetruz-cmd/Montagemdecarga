/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          sidebar: '#260f33',
          sidebarHover: '#371549',
          sidebarActive: '#431959',
          purple: '#7b1fa2',
          purpleDark: '#5c137a',
          purpleLight: '#f3e8ff',
          purpleAccent: '#9333ea',
          textMuted: '#9d7fa8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        'card-hover': '0 4px 12px -2px rgba(40, 20, 50, 0.08)',
        'purple-glow': '0 4px 14px 0 rgba(123, 31, 162, 0.35)',
      },
    },
  },
  plugins: [],
}
