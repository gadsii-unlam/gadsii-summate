import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { opcionesPwa } from './scripts/pwa/opciones.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // Service worker y manifiesto (tolerar-senal-irregular). Ver scripts/pwa/opciones.ts.
    VitePWA(opcionesPwa({ autodestruir: process.env.PWA_AUTODESTRUIR === '1' })),
  ],
})
