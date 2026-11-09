import { expect, test } from '@playwright/test'
import { abrir, comoUsuarioConocido } from '../ayudas.ts'
import {
  contenidoCaches,
  esperarServiceWorker,
  pedirDesdeLaPagina,
  respuestasDurante,
  versionPlano,
} from './ayudas-sw.ts'

// El service worker es el objeto de estas pruebas (el resto de la suite lo bloquea).
test.use({ serviceWorkers: 'allow' })

// Tareas 2.1, 2.2 (parte del service worker) y 2.3 de tolerar-senal-irregular. El plano es un
// único SVG en el precache (ya no hay teselas de detalle a demanda).

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
  await abrir(page)
  await esperarServiceWorker(page)
})

test('el plano vectorial sale del precache sin conexión, con la versión en la URL', async ({
  page,
  context,
}) => {
  const version = await versionPlano(page)
  const url = `/data/mapa-base.svg?v=${version}`
  await context.setOffline(true)
  const respuestas = await respuestasDurante(
    page,
    (u) => u.pathname === '/data/mapa-base.svg',
    async () => {
      const r = await pedirDesdeLaPagina(page, url)
      expect(r).toMatchObject({ ok: true, status: 200 })
      expect(r.cuerpo).toMatch(/^<svg /)
    },
  )
  expect(respuestas.length).toBeGreaterThan(0)
  for (const r of respuestas) expect(r.fromServiceWorker()).toBe(true)
})

test('cierres: con red vienen de la red; sin red, la copia guardada marcada con su hora', async ({
  page,
  context,
}) => {
  const conRed = await pedirDesdeLaPagina(page, '/data/cierres.json')
  expect(conRed).toMatchObject({ ok: true })
  expect(conRed.cabeceras['x-dq-origen']).toBeUndefined()
  await expect
    .poll(async () => (await contenidoCaches(page)).cierres ?? [])
    .toContain('/data/cierres.json')

  await context.setOffline(true)
  const sinRed = await pedirDesdeLaPagina(page, '/data/cierres.json')
  expect(sinRed).toMatchObject({ ok: true, status: 200 })
  expect(sinRed.cabeceras['x-dq-origen']).toBe('cache')
  expect(Date.parse(sinRed.cabeceras['x-dq-guardado-en'] ?? '')).not.toBeNaN()
  expect(JSON.parse(sinRed.cuerpo)).toHaveProperty('cierres')
})

test('clima: después de ?clima=lluvia con red, sin red la consulta falla y no devuelve lluvia', async ({
  page,
  context,
}) => {
  await page.goto('/?clima=lluvia')
  await esperarServiceWorker(page)
  const conRed = await pedirDesdeLaPagina(page, '/api/clima/lluvia.json')
  expect(conRed).toMatchObject({ ok: true })
  expect(JSON.parse(conRed.cuerpo)).toMatchObject({ llueve: true })

  await context.setOffline(true)
  // Como la pide `src/clima` (cache: 'no-store'): falla de red, nunca el `lluvia` anterior.
  const sinRed = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/clima/lluvia.json', { cache: 'no-store' })
      return { status: r.status, cuerpo: await r.text() }
    } catch (e) {
      return { error: e instanceof Error ? e.name : String(e) }
    }
  })
  expect(sinRed).toEqual({ error: 'TypeError' })

  // Ninguna caché guardó el clima.
  const todas = Object.values(await contenidoCaches(page)).flat()
  expect(todas.some((c) => c.startsWith('/api/'))).toBe(false)
})

test('precache: el plano y su respaldo están; los cierres, el clima y las teselas no', async ({
  page,
}) => {
  const cachesSw = await contenidoCaches(page)
  const precache = Object.entries(cachesSw).find(([n]) => n.startsWith('workbox-precache'))?.[1]
  expect(precache).toBeDefined()
  expect(precache).toContain('/data/mapa-base.svg')
  expect(precache).toContain('/data/mapa-base.webp')
  expect((precache ?? []).some((c) => c.includes('teselas'))).toBe(false)
  expect(Object.keys(cachesSw)).not.toContain('teselas-detalle')
  expect(precache).not.toContain('/data/cierres.json')
  expect((precache ?? []).some((c) => c.startsWith('/api/'))).toBe(false)
})
