/**
 * Configuración del service worker y del manifiesto (design.md de tolerar-senal-irregular,
 * decisiones 1, 2, 3, 7 y 8). La usa `vite.config.ts` y la revisan los tests de
 * `scripts/pwa/precache.test.ts`.
 *
 * - Precache (con revisión): la app, los íconos, el manifiesto, el grafo, el catálogo, la
 *   descripción del plano, el plano vectorial (`mapa-base.svg`) y la imagen de respaldo. Así el
 *   plano entero se ve sin conexión desde la primera visita, en cualquier zoom.
 * - `/data/cierres.json`: `NetworkFirst` (4 s) en la caché `cierres`. Nunca en el precache.
 * - `/api/clima/*`: `NetworkOnly`. Nunca se guarda.
 */
import type { ManifestOptions, VitePWAOptions } from 'vite-plugin-pwa'

/** Patrones (relativos a `dist/`) que entran en el precache. */
export const PATRONES_PRECACHE = [
  // App: index.html, JS y CSS con hash, favicon e íconos.
  '*.{html,svg}',
  'assets/**/*.{js,css,svg,png,webp,woff2}',
  'icons/*.png',
  // Datos del campus. El grafo, el catálogo y el plano no llevan hash en el nombre: Workbox les
  // pone revisión por contenido, así que cambiar un nodo cambia la revisión y la versión nueva.
  'data/grafo.json',
  'data/lugares.json',
  'data/plano.json',
  'data/mapa-base.svg',
  'data/mapa-base.webp',
]

/**
 * Tope de tamaño por archivo del precache. Workbox saltea (con un aviso) lo que pase de 2 MiB
 * por defecto, y `mapa-base.svg` ronda 1,5 MB: con 4 MiB hay margen si el plano crece.
 */
export const MAXIMO_BYTES_PRECACHE = 4 * 1024 * 1024

/** Lo que nunca puede entrar en el precache. */
export const EXCLUIDOS_PRECACHE = ['data/cierres.json', 'api/**', '**/README.md', '**/_*']

export const CACHE_CIERRES = 'cierres'
export const TIMEOUT_RED_CIERRES_S = 4

export const PATRON_CIERRES = /\/data\/cierres\.json$/
export const PATRON_CLIMA = /\/api\/clima\//

/**
 * Cabeceras con las que el service worker marca los cierres (decisión 3): la app las lee para
 * saber si los cierres usados vienen de la red o de la copia guardada, y desde cuándo.
 * Los mismos nombres están en `src/conexion/origen.ts`.
 */
export const CABECERA_ORIGEN = 'X-DQ-Origen'
export const CABECERA_GUARDADO_EN = 'X-DQ-Guardado-En'

/**
 * Plugin de Workbox para la ruta de cierres. Workbox lo copia al `sw.js` con `toString()`, así
 * que las funciones no pueden usar nada de afuera (los nombres de las cabeceras van escritos).
 * - Al guardar en la caché: solo respuestas 200, con `X-DQ-Guardado-En` (hora del dispositivo).
 * - Al responder desde la caché: agrega `X-DQ-Origen: cache`. Las de la red no la llevan.
 */
export const PLUGIN_ORIGEN_CIERRES = {
  cacheWillUpdate: async ({ response }: { response: Response }): Promise<Response | null> => {
    if (!response || response.status !== 200) return null
    const headers = new Headers(response.headers)
    headers.set('X-DQ-Guardado-En', new Date().toISOString())
    return new Response(await response.clone().blob(), {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  },
  cachedResponseWillBeUsed: async ({
    cachedResponse,
  }: {
    cachedResponse?: Response
  }): Promise<Response | undefined> => {
    if (!cachedResponse) return cachedResponse
    const headers = new Headers(cachedResponse.headers)
    headers.set('X-DQ-Origen', 'cache')
    return new Response(await cachedResponse.blob(), {
      status: cachedResponse.status,
      statusText: cachedResponse.statusText,
      headers,
    })
  },
}

export const MANIFIESTO: Partial<ManifestOptions> = {
  id: '/',
  name: '¿Dónde queda?',
  short_name: 'Dónde queda',
  description: 'Encontrá el camino más corto entre dos lugares del campus de la UNLaM.',
  lang: 'es-AR',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  orientation: 'portrait',
  theme_color: '#1A73E8',
  background_color: '#FFFFFF',
  icons: [
    { src: '/icons/icono-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icono-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    {
      src: '/icons/icono-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
}

export interface OpcionesPwa {
  /**
   * Plan de salida (Migration Plan, paso 3): publica un service worker que borra las cachés y se
   * desregistra. Se activa con `PWA_AUTODESTRUIR=1 npx vite build`.
   */
  autodestruir?: boolean
}

export function opcionesPwa({ autodestruir = false }: OpcionesPwa = {}): Partial<VitePWAOptions> {
  return {
    strategies: 'generateSW',
    // La versión nueva queda en espera hasta que la app la active (decisión 7).
    registerType: 'prompt',
    // Mientras ningún módulo importe `virtual:pwa-register/*`, el plugin agrega `registerSW.js`
    // en `index.html`; cuando la app use `useRegisterSW`, deja de agregarlo.
    injectRegister: 'auto',
    selfDestroying: autodestruir,
    manifest: MANIFIESTO,
    manifestFilename: 'manifest.webmanifest',
    // Los íconos ya entran por `icons/*.png` en `PATRONES_PRECACHE`.
    includeManifestIcons: false,
    devOptions: { enabled: false },
    workbox: {
      globPatterns: PATRONES_PRECACHE,
      globIgnores: EXCLUIDOS_PRECACHE,
      maximumFileSizeToCacheInBytes: MAXIMO_BYTES_PRECACHE,
      // Los archivos con hash en el nombre no necesitan revisión.
      dontCacheBustURLsMatching: /^assets\//,
      // El plano y la imagen de respaldo se piden como `mapa-base.{svg,webp}?v=<version>`.
      ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
      navigateFallback: 'index.html',
      navigateFallbackDenylist: [/^\/api\//, /^\/data\//],
      cleanupOutdatedCaches: true,
      // Sin `skipWaiting`: la versión nueva espera (decisión 7). `clientsClaim` solo importa en
      // la primera instalación, para que la primera visita ya guarde los cierres.
      skipWaiting: false,
      clientsClaim: true,
      runtimeCaching: [
        {
          urlPattern: PATRON_CIERRES,
          handler: 'NetworkFirst',
          options: {
            cacheName: CACHE_CIERRES,
            networkTimeoutSeconds: TIMEOUT_RED_CIERRES_S,
            // Solo guarda respuestas 200 (hace las veces de `cacheableResponse`).
            plugins: [PLUGIN_ORIGEN_CIERRES],
          },
        },
        { urlPattern: PATRON_CLIMA, handler: 'NetworkOnly' },
      ],
    },
  }
}
