/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // ACES brand — deep navy field, orange action accents
        bg: '#091524', // page background (deepest navy)
        panel: '#0B1D32', // card / panel background
        panel2: '#132B47', // raised panel
        navy: '#1A365D', // brand navy
        line: '#22436b', // borders / hairlines
        accent: '#F07316', // ACES orange
        accent2: '#60A5FA', // secondary blue
        ink: '#F1F5F9', // primary text
        muted: '#94A3B8', // secondary text
        ok: '#16A34A',
        warn: '#F59E0B',
        bad: '#DC2626',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
