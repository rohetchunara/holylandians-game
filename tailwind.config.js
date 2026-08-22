/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f5f0e8',
        slate: {
          850: '#192030',
          950: '#0c1018',
        },
      },
      backgroundImage: {
        'royal-gradient': 'linear-gradient(135deg, #0c1018 0%, #131826 50%, #0c1018 100%)',
        'nav-gradient': 'linear-gradient(135deg, #1e3a5f 0%, #2a4a7a 50%, #1e3a5f 100%)',
      },
      animation: {
        'slide-up': 'slideUp 0.4s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'pulse-glow': 'pulseGlow 3s ease-in-out infinite',
      },
      keyframes: {
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(30, 58, 95, 0.3)' },
          '50%': { boxShadow: '0 0 40px rgba(30, 58, 95, 0.5)' },
        },
      },
    },
  },
  plugins: [],
}
