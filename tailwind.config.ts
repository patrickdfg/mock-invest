import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0b0e13',
        panel: '#141922',
        panel2: '#1b2230',
        line: '#252d3d',
        muted: '#8b95a7',
        up: '#f04452',
        down: '#3182f6',
        brand: '#3182f6',
      },
      fontFamily: {
        sans: ['Pretendard', 'Apple SD Gothic Neo', 'Malgun Gothic', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
