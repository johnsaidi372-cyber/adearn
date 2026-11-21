/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  // Ad gradients are defined in server/index.js and sent as strings, so Tailwind
  // cannot detect them by scanning source files. Safelist those utilities.
  safelist: [
    {
      pattern: /^(from|via|to)-(indigo|violet|fuchsia|emerald|teal|cyan|lime|green|orange|rose|pink|sky|blue|amber|yellow|slate|red)-(400|500|600|700|900)$/,
    },
  ],
  theme: {
    extend: {
      colors: {
        ink: '#0f172a',
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          900: '#312e81',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(15,23,42,.06), 0 12px 32px -12px rgba(15,23,42,.12)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-ring': {
          '0%': { transform: 'scale(.95)', opacity: '.7' },
          '100%': { transform: 'scale(1.25)', opacity: '0' },
        },
      },
      animation: {
        'fade-up': 'fade-up .35s ease-out both',
        'pulse-ring': 'pulse-ring 1.8s ease-out infinite',
      },
    },
  },
  plugins: [],
}
