/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        midnight: {
          950: '#020617',
          900: '#050816',
          850: '#0a0f1f',
          800: '#0f172a',
        },
        neon: {
          emerald: '#34d399',
          'emerald-dim': '#059669',
          amber: '#fbbf24',
          'amber-hot': '#f59e0b',
          crimson: '#fb7185',
          'crimson-hot': '#f43f5e',
          cyan: '#22d3ee',
          violet: '#a78bfa',
        },
        brand: {
          DEFAULT: '#6366f1',
          light: '#818cf8',
          dark: '#4f46e5',
        },
        surface: {
          light: '#f8fafc',
          dark: '#0f172a',
        },
        accent: {
          cyan: '#06b6d4',
          emerald: '#10b981',
          amber: '#f59e0b',
          red: '#ef4444',
        },
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(to right, #6366f1, #06b6d4)',
        'gradient-dark': 'linear-gradient(to bottom right, #0f172a, #1e293b, #334155)',
        'mesh-command':
          'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(34, 211, 238, 0.15), transparent), radial-gradient(ellipse 60% 40% at 100% 0%, rgba(167, 139, 250, 0.12), transparent), radial-gradient(ellipse 50% 30% at 0% 100%, rgba(52, 211, 153, 0.08), transparent)',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0,0,0,0.15)',
        glow: '0 0 12px 2px rgba(99,102,241,0.3)',
        'glass-inset': 'inset 0 1px 0 0 rgba(255,255,255,0.06)',
        'neon-cyan': '0 0 20px rgba(34, 211, 238, 0.35)',
        'neon-emerald': '0 0 16px rgba(52, 211, 153, 0.4)',
        'neon-amber': '0 0 16px rgba(251, 191, 36, 0.35)',
        'neon-crimson': '0 0 20px rgba(244, 63, 94, 0.45)',
      },
      animation: {
        'spin-slow': 'spin 20s linear infinite',
        fade: 'fadeIn 0.3s ease-out',
        scale: 'scaleIn 0.3s ease-out',
        shimmer: 'shimmer 1.8s ease-in-out infinite',
        'pulse-glow': 'pulseGlow 2.4s ease-in-out infinite',
        'scan-line': 'scanLine 4s linear infinite',
        'trace-dot': 'traceDot 1.2s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: 0 },
          '100%': { opacity: 1 },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: 0 },
          '100%': { transform: 'scale(1)', opacity: 1 },
        },
        shimmer: {
          '0%': { backgroundPosition: '200% 0' },
          '100%': { backgroundPosition: '-200% 0' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: 0.5, filter: 'brightness(1)' },
          '50%': { opacity: 1, filter: 'brightness(1.25)' },
        },
        scanLine: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        traceDot: {
          '0%, 100%': { opacity: 0.35, transform: 'scale(0.85)' },
          '50%': { opacity: 1, transform: 'scale(1.05)' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
};
