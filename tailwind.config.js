/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#FEF2F2',
          100: '#FDE3E3',
          200: '#FCCBCB',
          300: '#F9A3A3',
          400: '#C42527',
          DEFAULT: '#A11D1F',
          dark: '#8A1819',
          700: '#6B1315',
          800: '#4E0E10',
          900: '#3A0A0C',
        },
        accent: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          DEFAULT: '#F59E0B',
          dark: '#D97706',
        },
        surface: {
          DEFAULT: '#F8F7F5',
          card: '#FFFFFF',
          elevated: '#FFFFFF',
          muted: '#F3F2EF',
        },
        ink: {
          DEFAULT: '#1A1A1A',
          secondary: '#6B7280',
          muted: '#9CA3AF',
          faint: '#D1D5DB',
        },
        bg: '#F8F7F5',
      },
      fontFamily: {
        sans: ['Pretendard', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.04), 0 1px 2px -1px rgba(0, 0, 0, 0.03)',
        'card-hover': '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',
        'elevated': '0 8px 24px -4px rgba(0, 0, 0, 0.08), 0 4px 8px -4px rgba(0, 0, 0, 0.03)',
      },
    },
  },
  plugins: [],
}
