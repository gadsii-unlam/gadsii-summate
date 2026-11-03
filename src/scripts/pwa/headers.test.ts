/**
 * Reglas de `public/_headers` (tolerar-senal-irregular, decisión 9). Cloudflare combina los
 * valores cuando una ruta coincide con varias reglas, así que cada ruta tiene que caer en una sola
 * regla de `Cache-Control`. Esto no reemplaza el chequeo con `curl -I` contra la vista previa.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { RAIZ } from '../rutas-proyecto.ts'

interface Regla {
  ruta: string
  cacheControl: string
}

function leerReglas(texto: string): Regla[] {
  const reglas: Regla[] = []
  let actual: string | null = null
  for (const linea of texto.split('\n')) {
    if (!linea.trim() || linea.trim().startsWith('#')) continue
    if (!/^\s/.test(linea)) {
      actual = linea.trim()
      continue
    }
    const m = /^\s+Cache-Control:\s*(.+)$/i.exec(linea)
    if (m?.[1] && actual) reglas.push({ ruta: actual, cacheControl: m[1].trim() })
  }
  return reglas
}

/** Coincidencia como en Cloudflare: `*` vale cualquier cosa (incluidas barras). */
function coincide(patron: string, ruta: string): boolean {
  const re = new RegExp(`^${patron.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`)
  return re.test(ruta)
}

const reglas = leerReglas(readFileSync(join(RAIZ, 'public', '_headers'), 'utf8'))

function cacheControl(ruta: string): string[] {
  return reglas.filter((r) => coincide(r.ruta, ruta)).map((r) => r.cacheControl)
}

const INMUTABLE = 'public, max-age=31536000, immutable'

describe('public/_headers', () => {
  it.each([
    ['/', 'no-cache'],
    ['/index.html', 'no-cache'],
    ['/sw.js', 'no-cache'],
    ['/registerSW.js', 'no-cache'],
    ['/manifest.webmanifest', 'no-cache'],
    ['/workbox-6cf96c6c.js', INMUTABLE],
    ['/assets/index-Cse38nqb.js', INMUTABLE],
    ['/data/grafo.json', 'no-cache'],
    ['/data/lugares.json', 'no-cache'],
    ['/data/plano.json', 'no-cache'],
    ['/data/mapa-base.svg', 'no-cache'],
    ['/data/mapa-base.webp', 'no-cache'],
    ['/data/cierres.json', 'no-cache'],
    ['/api/clima/lluvia.json', 'no-store'],
  ])('%s → %s (una sola regla)', (ruta, esperado) => {
    expect(cacheControl(ruta)).toEqual([esperado])
  })

  it('ninguna ruta de ejemplo cae en dos reglas', () => {
    const rutas = ['/icons/icono-192.png', '/favicon.svg', '/data/README.md']
    for (const r of rutas) expect(cacheControl(r).length, r).toBeLessThanOrEqual(1)
  })
})
