/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#080C1A',
        night: '#0D1224',
        surface: '#151B31',
        'surface-light': '#1C2340',
        cream: '#FFF9E9',
        muted: '#959DB5',
        lime: '#DDFA50',
        'lime-soft': '#F0FFAD',
        coral: '#FF6B6B',
        amber: '#FFC857',
        sky: '#7DD3FC',
        violet: '#B8A1FF',
      },
      fontFamily: {
        body: ['Manrope_500Medium'],
        'body-semibold': ['Manrope_600SemiBold'],
        'body-bold': ['Manrope_700Bold'],
        'body-extrabold': ['Manrope_800ExtraBold'],
        display: ['BricolageGrotesque_600SemiBold'],
        'display-bold': ['BricolageGrotesque_700Bold'],
        'display-black': ['BricolageGrotesque_800ExtraBold'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(221, 250, 80, 0.18)',
      },
    },
  },
  plugins: [],
};
