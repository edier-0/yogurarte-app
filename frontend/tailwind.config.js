/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{vue,js,ts,jsx,tsx}',
    './frontend/index.html',
    './frontend/src/**/*.{vue,js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Marca YogurArte - Morado Principal
        brand: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#7E22CE',
          700: '#581C87',
          800: '#36165E', // Morado Base Oficial
          900: '#230B40',
          950: '#160429',
          darkText: '#C4B5FD', // Lavanda legible para contrastes en modo oscuro
          darkSurface: 'rgba(109, 40, 217, 0.15)',
        },
        // Acento - Frambuesa / Magenta Artesanal (CTAs principales y promociones)
        accent: {
          50: '#FDF2F8',
          100: '#FCE7F3',
          200: '#FBCFE8',
          300: '#F472B6', // Suavizado para dark mode
          400: '#F43F5E',
          500: '#E60067', // Frambuesa Oficial CTA
          600: '#DE005E', // Magenta Intenso
          700: '#BE123C',
          800: '#9F1239',
          900: '#881337',
        },
        // Natural - Verde Hoja Probiótico (Éxito, Al Día, Probióticos)
        natural: {
          50: '#F2FBF0',
          100: '#E3F7DE',
          500: '#62A82C', // Verde Hoja Oficial
          600: '#4F8A22',
          700: '#3D6C1B',
        },
        // Lácteo / Trazabilidad - Azul Tapa (Domicilios, En Camino, Info)
        dairy: {
          50: '#EFF6FF',
          100: '#DBEAFE',
          500: '#1A56DB', // Azul Tapa Oficial
          600: '#1E40AF',
        },
        // Vainilla / Resalte (Alertas, Stock Bajo, Resaltes de Valor)
        vanilla: {
          50: '#FFFBEB',
          100: '#FEF3C7',
          500: '#FFC72C', // Vainilla Oficial
          600: '#D97706',
        },
        // Superficies Semánticas (Light & Dark)
        surface: {
          light: {
            canvas: '#FAF8F5', // Cálido Marfil Lácteo
            card: '#FFFFFF',
            border: '#E2E8F0',
            muted: '#64748B',
          },
          dark: {
            canvas: '#0F172A', // Slate 900
            card: '#1E293B',   // Slate 800
            modal: '#334155',  // Slate 700
            border: 'rgba(148, 163, 184, 0.12)',
            muted: '#94A3B8',
          },
        },
      },
      backgroundImage: {
        'hero-gradient': 'linear-gradient(135deg, #36165E 0%, #E60067 100%)',
        'accent-gradient': 'linear-gradient(135deg, #E60067 0%, #FFC72C 100%)',
        'natural-gradient': 'linear-gradient(135deg, #36165E 0%, #62A82C 100%)',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'sans-serif'],
        handwritten: ['Caveat', 'cursive'],
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.07), 0 1px 2px -1px rgba(0, 0, 0, 0.05)',
        elevated: '0 10px 25px -5px rgba(54, 22, 94, 0.1), 0 8px 10px -6px rgba(54, 22, 94, 0.05)',
        accent: '0 4px 14px 0 rgba(230, 0, 103, 0.35)',
      },
    },
  },
  plugins: [],
};
