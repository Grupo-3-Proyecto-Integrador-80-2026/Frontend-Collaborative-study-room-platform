/** @type {import('tailwindcss').Config} */
// Paleta del prototipo aprobado (AI Studio, Tailwind v4) llevada a hexadecimal para
// Tailwind v3: el índigo v4 (#4F39F6) es distinto del v3 (#4F46E5) y por eso se fija aquí.
const indigo = {
  50: '#EEF2FF', 100: '#E0E7FF', 200: '#C6D2FF', 300: '#A3B3FF', 400: '#7C86FF',
  500: '#615FFF', 600: '#4F39F6', 700: '#432DD7', 800: '#372AAC', 900: '#312C85', 950: '#1E1A4D',
};
const slate = {
  50: '#F8FAFC', 100: '#F1F5F9', 200: '#E2E8F0', 300: '#CAD5E2', 400: '#90A1B9',
  500: '#62748E', 600: '#45556C', 700: '#314158', 800: '#1D293D', 900: '#0F172B', 950: '#020618',
};
const rose = {
  50: '#FFF1F2', 100: '#FFE4E6', 200: '#FFCCD3', 300: '#FFA1AD', 400: '#FF637E',
  500: '#FF2056', 600: '#EC003F', 700: '#C70036', 800: '#A50036', 900: '#8B0836', 950: '#4D0218',
};
const emerald = {
  50: '#ECFDF5', 100: '#D0FAE5', 200: '#A4F4CF', 300: '#5EE9B5', 400: '#00D492',
  500: '#00BC7D', 600: '#009966', 700: '#007A55', 800: '#006045', 900: '#004F3B', 950: '#002C22',
};
const amber = {
  50: '#FFFBEB', 100: '#FEF3C6', 200: '#FEE685', 300: '#FFD230', 400: '#FFB900',
  500: '#FE9A00', 600: '#E17100', 700: '#BB4D00', 800: '#973C00', 900: '#7B3306', 950: '#461901',
};

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        indigo,
        slate,
        rose,
        emerald,
        amber,
        // Alias usados por las pantallas del Sprint 0–1; apuntan a la misma paleta.
        brand: { 50: indigo[50], 100: indigo[100], 600: indigo[600], 700: indigo[700], 900: indigo[900] },
        surface: {
          bg: slate[50],
          card: '#FFFFFF',
          text: slate[900],
          muted: slate[600],
          border: slate[200],
          control: slate[400],
        },
      },
    },
  },
  plugins: [],
};
