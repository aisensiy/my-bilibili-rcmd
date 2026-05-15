/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/popup/**/*.{js,ts,jsx,tsx,html}',
  ],
  theme: {
    extend: {
      colors: {
        bili: {
          pink: '#fb7299',
          blue: '#00a1d6',
        },
      },
    },
  },
  plugins: [],
}
