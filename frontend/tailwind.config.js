/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
        },
        // Module accent colors (per PRODUCT-SPEC)
        module: {
          finance: '#10b981',   // emerald
          health: '#ef4444',    // red
          habits: '#f59e0b',    // amber
          mood: '#ec4899',      // pink
          reading: '#a855f7',   // purple
          projects: '#3b82f6',  // blue
          trading: '#06b6d4',   // cyan
          travel: '#f97316',    // orange
          people: '#6366f1',    // indigo
          wiki: '#6b7280',      // gray
          time: '#14b8a6',      // teal
          decisions: '#eab308', // yellow
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        // Tighter typographic scale for dense dashboards
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
      },
      spacing: {
        // 4px grid is the Tailwind default; expose a few extra steps
        '4.5': '1.125rem',
        '13': '3.25rem',
        '15': '3.75rem',
      },
      boxShadow: {
        'card': '0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.08)',
        'card-hover': '0 4px 6px -1px rgb(0 0 0 / 0.10), 0 2px 4px -2px rgb(0 0 0 / 0.10)',
        'elevated': '0 10px 15px -3px rgb(0 0 0 / 0.20), 0 4px 6px -4px rgb(0 0 0 / 0.20)',
        'glow-brand': '0 0 0 3px rgb(99 102 241 / 0.25)',
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'fade-in-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { opacity: '0', transform: 'translateX(16px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.55' },
        },
        'celebrate': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
        },
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'progress': {
          '0%': { width: '100%' },
          '100%': { width: '0%' },
        },
        // Page-level transitions (route changes)
        'page-enter': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'page-enter-right': {
          '0%': { opacity: '0', transform: 'translateX(12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        // Staggered card entrance
        'card-enter': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        // Chart bar/area grow from bottom
        'chart-grow': {
          '0%': { opacity: '0', transform: 'scaleY(0.85)' },
          '100%': { opacity: '1', transform: 'scaleY(1)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out',
        'fade-in-up': 'fade-in-up 250ms ease-out',
        'slide-in-right': 'slide-in-right 250ms ease-out',
        'scale-in': 'scale-in 180ms ease-out',
        'shimmer': 'shimmer 1.6s linear infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'celebrate': 'celebrate 400ms ease-out',
        'toast-in': 'toast-in 220ms ease-out',
        'progress': 'progress linear forwards',
        'page-enter': 'page-enter 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        'page-enter-right': 'page-enter-right 280ms cubic-bezier(0.16, 1, 0.3, 1)',
        'card-enter': 'card-enter 300ms cubic-bezier(0.16, 1, 0.3, 1)',
        'chart-grow': 'chart-grow 400ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
    },
  },
  plugins: [],
}
