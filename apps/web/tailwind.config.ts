import type { Config } from 'tailwindcss';

export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        ink: '#00171F',
        'ink-deep': '#000B0F',
        slate: '#66747A',
        cerulean: '#007EA7',
        sky: '#00A8E8',
        deep: '#003459',
        silver: '#D4DEE2',
        success: '#1E8F53', // for integrity & registration ONLY
        danger: '#D93838',
        warn: '#DD8E4B',
        info: '#007EA7',    // for attribution - NEVER green!
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
