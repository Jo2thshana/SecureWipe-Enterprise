/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#0B1120',
          card: 'rgba(17, 24, 39, 0.7)', // Semi-transparent card backing
          border: 'rgba(139, 92, 246, 0.2)', // Soft purple border
          primary: '#8B5CF6', // Purple
          secondary: '#06B6D4', // Cyan
          accent: '#A78BFA', // Light purple
          success: '#10B981', // Emerald
          warning: '#F59E0B', // Amber
          danger: '#EF4444', // Red
          muted: '#9CA3AF' // Slate grey
        }
      },
      backgroundImage: {
        'cyber-gradient': 'linear-gradient(to bottom right, #0B1120, #111827, #070B14)',
        'glow-purple': 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
        'glow-cyan': 'radial-gradient(circle, rgba(6, 182, 212, 0.15) 0%, transparent 70%)'
      },
      boxShadow: {
        'neon-purple': '0 0 15px rgba(139, 92, 246, 0.5)',
        'neon-cyan': '0 0 15px rgba(6, 182, 212, 0.5)',
        'neon-green': '0 0 15px rgba(16, 185, 129, 0.5)',
        'neon-red': '0 0 15px rgba(239, 68, 68, 0.5)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      },
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'shimmer': 'shimmer 2.5s infinite linear',
        'glow': 'glow 2s infinite alternate'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        glow: {
          '0%': { boxShadow: '0 0 5px rgba(139, 92, 246, 0.2)' },
          '100%': { boxShadow: '0 0 20px rgba(139, 92, 246, 0.6)' }
        }
      }
    },
  },
  plugins: [],
}
