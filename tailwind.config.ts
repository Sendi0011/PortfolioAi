import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // PortfolioAI design tokens — dark terminal + amber accent
        bg:       '#0a0b0d',
        surface:  '#0f1115',
        panel:    '#161a20',
        border:   '#1e2530',
        muted:    '#3a4557',
        text:     '#c8d4e0',
        subtle:   '#6b7f96',
        amber:    '#f5a623',
        'amber-dim': '#a06a12',
        green:    '#22d18b',
        red:      '#f45b5b',
        blue:     '#4d9fff',
      },
      fontFamily: {
        mono:    ['var(--font-mono)', 'JetBrains Mono', 'monospace'],
        display: ['var(--font-display)', 'Syne', 'sans-serif'],
        body:    ['var(--font-body)', 'DM Sans', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow':  'spin 8s linear infinite',
        'fade-in':    'fadeIn 0.4s ease forwards',
        'slide-up':   'slideUp 0.35s ease forwards',
        'blink':      'blink 1.2s step-end infinite',
      },
      keyframes: {
        fadeIn:  { from: { opacity: '0' }, to: { opacity: '1' } },
        slideUp: { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        blink:   { '0%, 100%': { opacity: '1' }, '50%': { opacity: '0' } },
      },
      boxShadow: {
        'amber-glow': '0 0 24px 4px rgba(245, 166, 35, 0.15)',
        'green-glow': '0 0 20px 2px rgba(34, 209, 139, 0.12)',
      },
    },
  },
  plugins: [],
}

export default config