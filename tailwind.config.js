/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  // NativeWind's web runtime refuses to set a colour scheme while this is
  // Tailwind's default 'media', and throws on load. The app is light-only
  // anyway (`userInterfaceStyle: "light"`), so nothing ever adds the `dark`
  // class and no dark variant activates.
  darkMode: 'class',
  theme: {
    extend: {
      // Mirrors src/theme.ts — see the note there.
      colors: {
        surface: '#FBFAF7',
        ink: '#171310',
        muted: '#6B6259',
        line: '#E4DED4',
        cherry: '#8C1D2C',
        voronet: '#2A5DA8',
        pine: '#3F5D4A',
      },
    },
  },
  plugins: [],
};
