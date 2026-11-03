import { defineConfig, devices } from '@playwright/test'

const PUERTO = 4173
const celular = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: 'es-AR',
}

// `npm run test:e2e` corre solo el proyecto `movil` (Chromium).
// El proyecto `webkit` se corre a mano: `npx playwright test --project=webkit`.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['html', { open: 'never' }], ['github']] : [['list']],
  use: {
    baseURL: `http://localhost:${PUERTO}`,
    trace: 'on-first-retry',
    // `page.route` no ve lo que responde el service worker: el resto de los tests lo bloquea.
    // La suite `sin-conexion/` lo habilita con `test.use({ serviceWorkers: 'allow' })`.
    serviceWorkers: 'block',
  },
  projects: [
    {
      name: 'movil',
      use: { ...devices['Pixel 7'], ...celular, browserName: 'chromium' },
      // Las áreas seguras de iOS se prueban solo en WebKit.
      testIgnore: /iphone\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['iPhone 14'], ...celular, browserName: 'webkit' },
      // Los gestos usan eventos táctiles de CDP (solo Chromium); WebKit corre los recorridos.
      testIgnore: /gestos\.spec\.ts/,
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PUERTO} --strictPort`,
    url: `http://localhost:${PUERTO}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
