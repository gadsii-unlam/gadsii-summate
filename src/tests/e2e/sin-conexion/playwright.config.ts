import { defineConfig, devices } from '@playwright/test'

/**
 * Suite sin conexión (tolerar-senal-irregular, decisión 10) sola, contra un build propio en otro
 * puerto, sin regenerar `public/data` (usa los datos que ya están):
 *
 *   npx playwright test -c tests/e2e/sin-conexion/playwright.config.ts
 *
 * Con `npm run test:e2e` estos tests corren también, con el resto, contra el build completo.
 */
const PUERTO = 4183
const SALIDA = 'node_modules/.cache/dist-sin-conexion'

export default defineConfig({
  testDir: '.',
  testMatch: /\.spec\.ts$/,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'retain-on-failure',
    serviceWorkers: 'allow',
  },
  projects: [
    {
      name: 'movil',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true,
        locale: 'es-AR',
        browserName: 'chromium',
      },
    },
  ],
  webServer: {
    command: `npx vite build --outDir ${SALIDA} --emptyOutDir && npx vite preview --outDir ${SALIDA} --port ${PUERTO} --strictPort`,
    cwd: '../../..',
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
