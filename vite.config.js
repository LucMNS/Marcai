import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Marcaí - Organização de Rolês',
        short_name: 'Marcaí',
        description: 'Encontre o dia perfeito',
        theme_color: '#1A1814',
        background_color: '#1E1B18',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: 'https://api.iconify.design/material-symbols:calendar-today.svg?color=%23C6B49A',
            sizes: '192x192',
            type: 'image/svg+xml'
          },
          {
            src: 'https://api.iconify.design/material-symbols:calendar-today.svg?color=%23C6B49A',
            sizes: '512x512',
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
})