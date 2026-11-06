/** @type {import('tailwindcss').Config} */
// Colores y tipografía de la guía visual del producto (contraste medido sobre blanco)
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          600: '#3730A3', // Primario (9,9:1)
          700: '#312E81', // Primario hover (11,4:1)
          900: '#1E1B4B',
        },
        surface: {
          bg: '#F9FAFB',      // Superficie
          card: '#FFFFFF',    // Fondo
          text: '#111827',    // Texto (17,7:1)
          muted: '#4B5563',   // Texto secundario (7,6:1)
          border: '#D1D5DB',  // Borde decorativo (solo divisores y tarjetas)
          control: '#6B7280', // Borde de controles (4,8:1)
        },
      },
    },
  },
  plugins: [],
}
