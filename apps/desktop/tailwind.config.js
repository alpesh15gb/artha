import { tokens } from '@artha/ui-tokens';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: tokens.colors.primary,
          light: tokens.colors.primaryLight,
          dark: tokens.colors.primaryDark,
        },
        surface: {
          DEFAULT: tokens.colors.surface,
          light: tokens.colors.surfaceLight,
          dark: tokens.colors.background,
        },
      },
      backgroundColor: {
        dark: tokens.colors.background,
        'dark-surface': tokens.colors.surface,
      },
      textColor: {
        premium: tokens.colors.text,
        muted: tokens.colors.textMuted,
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
