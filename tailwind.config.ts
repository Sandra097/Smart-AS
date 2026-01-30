import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ms-blue': '#0078D4',
        'ms-dark-blue': '#106EBE',
        'light-gray': '#F5F5F5',
        'dark-gray': '#E0E0E0',
        'copilot-gradient-1': '#7B61FF',
        'copilot-gradient-2': '#00C4CC',
        'copilot-gradient-3': '#FF6B6B',
        'copilot-beige': '#F4F2EE',
        'copilot-beige-dark': '#E8E4DE',
        'copilot-cream': '#FAF9F7',
      },
      fontFamily: {
        sans: ['Segoe UI', 'Tahoma', 'Geneva', 'Verdana', 'sans-serif'],
      },
      borderRadius: {
        'input': '12px',
        'pill': '20px',
      },
      boxShadow: {
        'subtle': '0 2px 8px rgba(0,0,0,0.1)',
        'hover': '0 4px 12px rgba(0,0,0,0.15)',
      },
      transitionDuration: {
        'smooth': '200ms',
      },
    },
  },
  plugins: [],
};

export default config;
