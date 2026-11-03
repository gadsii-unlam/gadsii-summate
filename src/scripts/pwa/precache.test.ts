/**
 * Test del build (tolerar-senal-irregular, tareas 1.1, 1.2 y 7.1): compila la app con
 * `vite build` en una carpeta temporal y revisa el service worker y el manifiesto generados.
 * Usa los datos que haya en `public/data/` (los genera `npm run datos:build`).
 */
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { RAIZ } from '../rutas-proyecto.ts'

interface EntradaPrecache {
  url: string
  revision: string | null
}

/** Una instancia de una clase de Workbox: su nombre y los argumentos del constructor. */
interface Instancia {
  clase: string
  args: unknown[]
}

interface Ruta {
  patron: unknown
  manejador: Instancia
}

interface ServiceWorker {
  precache: EntradaPrecache[]
  opcionesPrecache: Record<string, unknown>
  rutas: Ruta[]
  llamadas: string[]
}

let dist = ''
let sw: ServiceWorker

/**
 * Ejecuta `sw.js` con un Workbox simulado que anota cada llamada: así el test no depende de cómo
 * se minifica el código generado.
 */
function ejecutarServiceWorker(codigo: string): ServiceWorker {
  const resultado: ServiceWorker = { precache: [], opcionesPrecache: {}, rutas: [], llamadas: [] }
  const clases = new Map<string, unknown>()
  const clase = (nombre: string) => {
    if (!clases.has(nombre)) {
      clases.set(
        nombre,
        class {
          clase = nombre
          args: unknown[]
          constructor(...args: unknown[]) {
            this.args = args
          }
        },
      )
    }
    return clases.get(nombre)
  }
  const funciones: Record<string, (...args: unknown[]) => unknown> = {
    precacheAndRoute: (lista, opciones) => {
      resultado.precache = lista as EntradaPrecache[]
      resultado.opcionesPrecache = (opciones ?? {}) as Record<string, unknown>
    },
    registerRoute: (patron, manejador) => {
      resultado.rutas.push({ patron, manejador: manejador as Instancia })
    },
    createHandlerBoundToURL: (url) => ({ clase: 'HandlerBoundToURL', args: [url] }),
  }
  const workbox = new Proxy(
    {},
    {
      get: (_, nombre: string) => {
        if (/^[A-Z]/.test(nombre)) return clase(nombre)
        return (...args: unknown[]) => {
          resultado.llamadas.push(nombre)
          return funciones[nombre]?.(...args)
        }
      },
    },
  )
  const define = (_deps: unknown, fabrica: (wb: unknown) => void) => fabrica(workbox)
  const self = {
    define,
    addEventListener: (tipo: string) => resultado.llamadas.push(`addEventListener:${tipo}`),
    skipWaiting: () => resultado.llamadas.push('self.skipWaiting'),
  }
  new Function('self', 'define', codigo)(self, define)
  return resultado
}

function archivos(dir: string, base = ''): string[] {
  return readdirSync(join(dir, base), { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? archivos(dir, join(base, e.name)) : [join(base, e.name)],
  )
}

beforeAll(async () => {
  dist = mkdtempSync(join(tmpdir(), 'dq-pwa-'))
  await build({
    root: RAIZ,
    configFile: join(RAIZ, 'vite.config.ts'),
    logLevel: 'silent',
    build: { outDir: dist, emptyOutDir: true },
  })
  sw = ejecutarServiceWorker(readFileSync(join(dist, 'sw.js'), 'utf8'))
}, 60_000)

afterAll(() => {
  if (dist) rmSync(dist, { recursive: true, force: true })
})

const urls = () => sw.precache.map((e) => e.url)

describe('service worker generado (1.1)', () => {
  it('genera sw.js, el runtime de Workbox y el manifiesto', () => {
    expect(existsSync(join(dist, 'sw.js'))).toBe(true)
    expect(readdirSync(dist).some((f) => /^workbox-[\w-]+\.js$/.test(f))).toBe(true)
    expect(existsSync(join(dist, 'manifest.webmanifest'))).toBe(true)
  })

  it('precachea index.html, todos los JS y CSS con hash, los íconos y el manifiesto', () => {
    const lista = new Set(urls())
    expect(lista.has('index.html')).toBe(true)
    expect(lista.has('manifest.webmanifest')).toBe(true)
    const assets = archivos(dist, 'assets').filter((f) => /\.(js|css)$/.test(f))
    expect(assets.length).toBeGreaterThan(0)
    for (const a of assets) expect(lista.has(a)).toBe(true)
    for (const i of ['icono-192.png', 'icono-512.png', 'icono-maskable-512.png']) {
      expect(lista.has(`icons/${i}`)).toBe(true)
    }
    expect(urls().length).toBe(lista.size) // sin duplicados
  })

  it('redirige la navegación a index.html (NavigationRoute), salvo /api y /data', () => {
    const nav = sw.rutas.find((r) => (r.patron as Instancia).clase === 'NavigationRoute')
    const [manejador, opciones] = (nav?.patron as Instancia).args as [
      Instancia,
      { denylist: RegExp[] },
    ]
    expect(manejador.args).toEqual(['index.html'])
    const negada = (ruta: string) => opciones.denylist.some((r) => r.test(ruta))
    expect(negada('/')).toBe(false)
    expect(negada('/lugar/salud')).toBe(false)
    expect(negada('/api/clima/seco.json')).toBe(true)
    expect(negada('/data/cierres.json')).toBe(true)
  })

  it('no salta la espera: la versión nueva queda en espera (registerType prompt)', () => {
    expect(sw.llamadas).not.toContain('skipWaiting')
    expect(sw.llamadas).not.toContain('self.skipWaiting')
    // Solo se activa cuando la app manda SKIP_WAITING ("Actualizar").
    expect(sw.llamadas).toContain('addEventListener:message')
    expect(sw.llamadas).toContain('clientsClaim')
    expect(sw.llamadas).toContain('cleanupOutdatedCaches')
  })

  it('index.html enlaza el manifiesto y el ícono de iOS; el registro va en el bundle', () => {
    const html = readFileSync(join(dist, 'index.html'), 'utf8')
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest">')
    expect(html).toContain('<link rel="apple-touch-icon" href="/icons/apple-touch-icon-180.png"')
    // La app registra el service worker con `useRegisterSW` (virtual:pwa-register/react):
    // el plugin ya no agrega `registerSW.js`.
    expect(html).not.toContain('registerSW.js')
    const js = archivos(dist, 'assets')
      .filter((f) => f.endsWith('.js'))
      .map((f) => readFileSync(join(dist, f), 'utf8'))
      .join('\n')
    expect(js).toMatch(/serviceWorker/)
    expect(js).toContain('/sw.js')
  })
})

describe('datos y plano en el precache (1.2)', () => {
  it('incluye el grafo, el catálogo, el plano vectorial y la imagen de respaldo con revisión', () => {
    for (const u of [
      'data/grafo.json',
      'data/lugares.json',
      'data/plano.json',
      'data/mapa-base.svg',
      'data/mapa-base.webp',
    ]) {
      const e = sw.precache.find((x) => x.url === u)
      expect(e, u).toBeDefined()
      expect(e?.revision).toMatch(/^[0-9a-f]{32}$/)
    }
  })

  it('no incluye teselas', () => {
    expect(urls().some((u) => u.includes('teselas'))).toBe(false)
  })

  it('no incluye los cierres ni el clima', () => {
    expect(urls()).not.toContain('data/cierres.json')
    expect(urls().some((u) => u.includes('cierres'))).toBe(false)
    expect(urls().some((u) => u.startsWith('api/') || u.includes('clima'))).toBe(false)
  })

  it('pesa menos de 3 MB en total (sin comprimir: el SVG viaja con gzip o brotli)', () => {
    const total = urls().reduce((s, u) => s + statSync(join(dist, u)).size, 0)
    expect(total).toBeLessThan(3 * 1024 * 1024)
  })

  it('acepta el plano y la imagen de respaldo con ?v=<version>', () => {
    const params = sw.opcionesPrecache.ignoreURLParametersMatching as RegExp[]
    expect(params.some((r) => r.test('v'))).toBe(true)
  })
})

/** Estrategia que atiende una URL (la primera ruta con `RegExp` que coincide, como Workbox). */
function estrategia(url: string): Instancia | undefined {
  const completa = new URL(url, 'https://donde-queda.example').href
  return sw.rutas.find((r) => r.patron instanceof RegExp && r.patron.test(completa))?.manejador
}

describe('estrategias en tiempo de ejecución (2.1 a 2.3)', () => {
  it('cierres: NetworkFirst con 4 s en la caché cierres', () => {
    const e = estrategia('/data/cierres.json')
    expect(e?.clase).toBe('NetworkFirst')
    expect(e?.args[0]).toMatchObject({ cacheName: 'cierres', networkTimeoutSeconds: 4 })
  })

  it('clima: NetworkOnly, para todos los escenarios', () => {
    for (const nombre of ['seco', 'lluvia', 'error', 'lento']) {
      expect(estrategia(`/api/clima/${nombre}.json`)?.clase).toBe('NetworkOnly')
    }
  })

  it('el grafo y el catálogo no tienen rutas propias (salen del precache)', () => {
    expect(estrategia('/data/grafo.json')).toBeUndefined()
    expect(estrategia('/data/lugares.json')).toBeUndefined()
  })
})
describe('manifiesto (7.1)', () => {
  it('tiene los campos para instalar la app', () => {
    const m = JSON.parse(readFileSync(join(dist, 'manifest.webmanifest'), 'utf8')) as Record<
      string,
      unknown
    >
    expect(m).toMatchObject({
      name: '¿Dónde queda?',
      short_name: 'Dónde queda',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      theme_color: '#1A73E8',
      background_color: '#FFFFFF',
      lang: 'es-AR',
    })
    const iconos = m.icons as { src: string; sizes: string; purpose?: string; type: string }[]
    expect(iconos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sizes: '192x192', type: 'image/png' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'any' }),
        expect.objectContaining({ sizes: '512x512', purpose: 'maskable' }),
      ]),
    )
    for (const i of iconos) expect(existsSync(join(dist, i.src))).toBe(true)
  })
})
