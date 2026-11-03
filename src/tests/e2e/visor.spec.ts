import { expect, test } from '@playwright/test'
import { abrir, caja, comoUsuarioConocido, esperarMapaQuieto } from './ayudas.ts'

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

test('el plano ocupa todo el viewport de 390 × 844 con el fondo de la vereda y sin atribución', async ({
  page,
}) => {
  await abrir(page)
  const mapa = await caja(page, '.mapa')
  expect(mapa).toEqual({ x: 0, y: 0, width: 390, height: 844 })
  expect(await page.locator('.mapa').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe(
    'rgb(248, 248, 248)',
  )
  await expect(page.locator('.leaflet-control-attribution')).toHaveCount(0)
  await expect(page.locator('.leaflet-control-zoom')).toHaveCount(0)
  // La tarjeta, los botones y la hoja quedan encima del plano.
  for (const sel of ['.tarjeta-superior', '.botones-flotantes', '.hoja']) {
    await expect(page.locator(sel)).toBeVisible()
  }
  const anchos = await page.evaluate(() => [
    document.documentElement.scrollWidth,
    window.innerWidth,
  ])
  expect(anchos[0]).toBeLessThanOrEqual(anchos[1]!)
})

test('el plano es un único SVG, /data/mapa-base.svg?v=<version>, sin teselas', async ({ page }) => {
  const pedidas: string[] = []
  page.on('request', (r) => {
    const u = new URL(r.url())
    if (u.pathname.startsWith('/data/') && !u.pathname.endsWith('.json'))
      pedidas.push(u.pathname + u.search)
  })
  await abrir(page)
  expect(pedidas).toHaveLength(1)
  expect(pedidas[0]).toMatch(/^\/data\/mapa-base\.svg\?v=[0-9a-f]+$/)
  await expect(page.locator('.leaflet-tile')).toHaveCount(0)
})

test('al acercar, el plano se vuelve a dibujar al tamaño de la pantalla (no se estira)', async ({
  page,
}) => {
  await abrir(page)
  const tamanos = async () =>
    page.locator('img.mapa__plano').evaluate((img: HTMLImageElement) => {
      const z = Number(img.closest<HTMLElement>('.mapa')?.dataset.zoom)
      // Leaflet fija el ancho del <img> en px de pantalla: con el SVG eso es lo que se dibuja.
      return { z, ancho: img.getBoundingClientRect().width, estilo: parseFloat(img.style.width) }
    })
  await page.locator('.mapa').focus()
  // Leaflet acerca con la tecla del "+" (keyCode 187): en Playwright es `Equal`.
  // Con pausas: durante la animación de zoom, Leaflet ignora la tecla.
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Equal')
    await page.waitForTimeout(350)
  }
  await esperarMapaQuieto(page)
  const t = await tamanos()
  expect(t.z).toBe(2)
  // Leaflet redondea las esquinas a px enteros.
  expect(Math.abs(t.estilo - 2810 * 4)).toBeLessThanOrEqual(1)
  expect(Math.abs(t.ancho - t.estilo)).toBeLessThanOrEqual(1)
})

test('los panes plano, cierres, ruta y marcadores se apilan en ese orden', async ({ page }) => {
  await abrir(page)
  const z = await page.evaluate(() =>
    ['plano', 'cierres', 'ruta', 'marcadores'].map((n) => {
      const el = document.querySelector<HTMLElement>(`.leaflet-${n}-pane`)
      return el ? Number(getComputedStyle(el).zIndex) : NaN
    }),
  )
  expect(z.every((n) => Number.isFinite(n))).toBe(true)
  expect([...z].sort((a, b) => a - b)).toEqual(z)
})

test('si falla el SVG, el plano sigue visible con la imagen única', async ({ page }) => {
  await page.route('**/data/mapa-base.svg*', (r) => r.abort())
  await page.goto('/')
  await expect(page.locator('img.mapa__plano')).toHaveCount(0)
  const respaldo = page.locator('img.mapa__respaldo')
  await expect(respaldo).toBeVisible({ timeout: 10_000 })
  await expect
    .poll(() => respaldo.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true)
})

test('el encuadre inicial muestra la zona de edificios entre la tarjeta y la hoja colapsada', async ({
  page,
}) => {
  await abrir(page)
  const z = Number(await page.locator('.mapa').getAttribute('data-zoom'))
  const tarjeta = await caja(page, '.tarjeta-superior')
  const hoja = await caja(page, '.hoja')
  const franja = hoja.y - (tarjeta.y + tarjeta.height)
  // La caja de edificios (960 × 1440 px del plano) entra entera en la franja visible.
  expect(1440 * 2 ** z).toBeLessThanOrEqual(franja)
  expect(960 * 2 ** z).toBeLessThanOrEqual(390)
})
