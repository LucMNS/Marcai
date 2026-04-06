/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "on-primary-fixed-variant": "var(--on-primary-fixed-variant)",
        "secondary-container": "var(--secondary-container)",
        "surface-variant": "var(--surface-variant)",
        "secondary": "var(--secondary)",
        "surface-container-lowest": "var(--surface-container-lowest)",
        "on-error": "var(--on-error)",
        "secondary-fixed-dim": "var(--secondary-fixed-dim)",
        "surface-container-low": "var(--surface-container-low)",
        "surface-container-highest": "var(--surface-container-highest)",
        "surface": "var(--surface)", 
        "outline-variant": "var(--outline-variant)",
        "on-tertiary-fixed-variant": "var(--on-tertiary-fixed-variant)",
        "on-tertiary-container": "var(--on-tertiary-container)",
        "on-tertiary-fixed": "var(--on-tertiary-fixed)",
        "on-surface": "var(--on-surface)",
        "error": "var(--error)",
        "on-primary-fixed": "var(--on-primary-fixed)",
        "primary-fixed": "var(--primary-fixed)",
        "primary": "var(--primary)",
        "primary-container": "var(--primary-container)",
        "on-surface-variant": "var(--on-surface-variant)",
        "surface-tint": "var(--surface-tint)",
        "secondary-fixed": "var(--secondary-fixed)",
        "tertiary-fixed-dim": "var(--tertiary-fixed-dim)",
        "on-error-container": "var(--on-error-container)",
        "on-secondary-fixed": "var(--on-secondary-fixed)",
        "on-secondary": "var(--on-secondary)",
        "on-secondary-fixed-variant": "var(--on-secondary-fixed-variant)",
        "inverse-surface": "var(--inverse-surface)",
        "tertiary-container": "var(--tertiary-container)",
        "on-primary-container": "var(--on-primary-container)",
        "on-tertiary": "var(--on-tertiary)",
        "inverse-on-surface": "var(--inverse-on-surface)",
        "primary-fixed-dim": "var(--primary-fixed-dim)",
        "tertiary-fixed": "var(--tertiary-fixed)",
        "on-background": "var(--on-background)",
        "surface-dim": "var(--surface-dim)",
        "surface-bright": "var(--surface-bright)",
        "on-secondary-container": "var(--on-secondary-container)",
        "inverse-primary": "var(--inverse-primary)",
        "on-primary": "var(--on-primary)",
        "error-container": "var(--error-container)",
        "background": "var(--background)",
        "surface-container": "var(--surface-container)",
        "tertiary": "var(--tertiary)",
        "outline": "var(--outline)",
        "surface-container-high": "var(--surface-container-high)"
      },
      borderRadius: {
        "DEFAULT": "1rem",
        "lg": "2rem",
        "xl": "3rem",
        "full": "9999px"
      },
      fontFamily: {
        "headline": ['"Plus Jakarta Sans"', "sans-serif"],
        "body": ['"Be Vietnam Pro"', "sans-serif"],
        "label": ['"Be Vietnam Pro"', "sans-serif"]
      },
      keyframes: {
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out forwards',
      }
    },
  },
  plugins: [],
}