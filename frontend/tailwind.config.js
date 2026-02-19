/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"DM Sans"', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        void: {
          50:  '#1E1E30',
          100: '#18182A',
          200: '#141422',
          300: '#10101C',
          400: '#0D0D18',
          500: '#0B0B14',
          900: '#06060E',
        },
      },
      boxShadow: {
        'glow-violet': '0 0 24px rgba(124,58,237,0.30)',
        'glow-cyan':   '0 0 24px rgba(6,182,212,0.22)',
        'glass':       '0 8px 32px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
        'modal':       '0 24px 64px rgba(0,0,0,0.65), 0 8px 24px rgba(0,0,0,0.35)',
        'input':       '0 2px 12px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
}
