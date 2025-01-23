/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        coffee: {
          50: '#FAF7F2',
          100: '#E8D6C0',
          200: '#D4B494',
          300: '#C09268',
          400: '#AB703C',
          500: '#8B5E2F',
          600: '#6B4B22',
          700: '#4B3815',
          800: '#2B2508',
          900: '#0B1200',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};