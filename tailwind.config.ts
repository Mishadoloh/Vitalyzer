import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0f1115',
        'bg-elevated': '#161922',
        'bg-card': '#1b1f2a',
        border: '#2a2f3d',
        text: '#e8eaf0',
        'text-muted': '#8a90a3',
        accent: '#6ee7b7',
        'accent-strong': '#34d399',
        warn: '#fbbf24',
        danger: '#f87171',
        info: '#60a5fa',
      },
    },
  },
  plugins: [],
};

export default config;
