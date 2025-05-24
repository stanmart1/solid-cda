import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "rgb(var(--background-rgb))", // Adjusted to use RGB variable for opacity support
        foreground: "rgb(var(--foreground-rgb))", // Adjusted to use RGB variable for opacity support
        primary: {
          DEFAULT: '#0284c7', // sky-600
          hover: '#0369a1', // sky-700 (for hover states)
          text: '#ffffff' // Default text color on primary background
        },
        secondary: {
          DEFAULT: '#10b981', // emerald-500
          hover: '#059669', // emerald-600
          text: '#ffffff'
        },
        accent: {
          DEFAULT: '#f59e0b', // amber-500
          hover: '#d97706', // amber-600
          text: '#ffffff' 
        },
        neutral: '#f3f4f6', // gray-100 for light backgrounds or card backgrounds
        'base-content': '#1f2937', // gray-800 for primary text
        'base-200': '#e5e7eb', // gray-200 for borders or subtle backgrounds
        'base-300': '#d1d5db', // gray-300
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('@tailwindcss/line-clamp'),
  ],
} satisfies Config;
