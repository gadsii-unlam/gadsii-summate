import { expect, test, type Page } from '@playwright/test'
import sharp from 'sharp'
import {
  abrir,
  comoUsuarioConocido,
  dobleToque,
  esperarMapaQuieto,
  esperarPlano,
  estadoMapa,
} from '../ayudas.ts'
import { esperarServiceWorker } from './ayudas-sw.ts'

// Plano sin conexión (tolerar-senal-irregular, tarea 3.1 y el caso 5 de la decisión 10). El plano
// es un único SVG que el service worker guarda al instalar: sin conexión se ve igual que con red
// en cualquier zona y zoom.

test.use({ serviceWorkers: 'allow' })

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

/** Acerca con doble toque en el centro de la franja hasta el zoom máximo (2). */
async function zoomMaximo(page: Page) {
  // La hoja de la ficha termina de anclarse antes de medir (el centro depende de la franja).
  await expect(page.locator('.hoja')).toHaveAttribute('data-altura', 'media')
  await esperarMapaQuieto(page)
  await page.waitForTimeout(400)
  const f = await franja(page)
  const centro = { x: f.x + f.width / 2, y: f.y + f.height / 2 }
  for (let i = 0; i < 8; i++) {
    if (Number(await page.locator('.mapa').getAttribute('data-zoom')) >= 2) break
    await dobleToque(page, centro)
    await esperarMapaQuieto(page)
  }
  await esperarMapaQuieto(page)
  await expect(page.locator('.mapa')).toHaveAttribute('data-zoom', '2')
}

/** Franja visible del mapa (entre la tarjeta y la hoja), para la captura. */
async function franja(page: Page) {
  const tarjeta = (await page.locator('.tarjeta-superior').boundingBox())!
  const hoja = (await page.locator('.hoja').boundingBox())!
  const y = Math.ceil(tarjeta.y + tarjeta.height) + 4
  return { x: 0, y, width: page.viewportSize()!.width, height: Math.floor(hoja.y) - y - 4 }
}

/** Captura del plano solo (sin la barra "Sin conexión" ni los botones flotantes). */
async function captura(page: Page) {
  await esperarPlano(page)
  await page.waitForTimeout(400) // el navegador vuelve a dibujar el SVG al tamaño final
  await page.addStyleTag({ content: '.pila-avisos, .botones-flotantes { visibility: hidden }' })
  return page.screenshot({ clip: await franja(page), animations: 'disabled' })
}

/** Diferencia media por canal (0 a 255) entre dos capturas del mismo tamaño. */
async function diferencia(a: Buffer, b: Buffer): Promise<number> {
  const [ra, rb] = await Promise.all(
    [a, b].map((x) => sharp(x).removeAlpha().raw().toBuffer({ resolveWithObject: true })),
  )
  expect(ra!.info.width).toBe(rb!.info.width)
  expect(ra!.info.height).toBe(rb!.info.height)
  let suma = 0
  for (let i = 0; i < ra!.data.length; i++) suma += Math.abs(ra!.data[i]! - rb!.data[i]!)
  return suma / ra!.data.length
}

/** Proporción de píxeles del color de fondo vacío del visor (gris sin plano). */
async function proporcionVacia(png: Buffer): Promise<number> {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  // Fondo del contenedor de Leaflet sin plano (`--color-fondo-mapa` u otro gris uniforme):
  // se cuenta el color más frecuente, que con el plano dibujado no domina toda la franja.
  const cuenta = new Map<number, number>()
  for (let i = 0; i < data.length; i += 3) {
    const c = (data[i]! << 16) | (data[i + 1]! << 8) | data[i + 2]!
    cuenta.set(c, (cuenta.get(c) ?? 0) + 1)
  }
  const max = Math.max(...cuenta.values())
  return max / (info.width * info.height)
}

const LUGAR_NO_VISITADO = '/#lugar/comedor-universitario'

test('zoom máximo sin conexión sobre una zona nunca vista: el plano se ve igual que con red', async ({
  page,
  context,
}) => {
  // Referencia con red.
  await abrir(page)
  await esperarServiceWorker(page)
  await page.goto(`/?ref=1${LUGAR_NO_VISITADO.slice(1)}`)
  await expect(page.getByRole('heading', { level: 2, name: /Comedor Universitario/ })).toBeVisible()
  await zoomMaximo(page)
  const referencia = await captura(page)
  const estadoRef = await estadoMapa(page)

  // Sin conexión: el SVG sale del precache.
  await context.setOffline(true)
  await page.goto(`/?sin-red=1${LUGAR_NO_VISITADO.slice(1)}`)
  await expect(page.getByRole('heading', { level: 2, name: /Comedor Universitario/ })).toBeVisible()
  await zoomMaximo(page)
  await expect(page.locator('img.mapa__respaldo')).toHaveCount(0)
  const sinRed = await captura(page)
  // Misma vista que la referencia: la comparación es de la misma zona y el mismo zoom.
  expect(await estadoMapa(page)).toEqual(estadoRef)

  expect(await diferencia(referencia, sinRed)).toBeLessThan(2)
  // Y no es una franja vacía: el plano tiene más de un color.
  expect(await proporcionVacia(sinRed)).toBeLessThan(0.9)

  // El plano cubre toda la franja del mapa (sin áreas vacías).
  const f = await franja(page)
  const r = await page.locator('img.mapa__plano').evaluate((img) => {
    const c = img.getBoundingClientRect()
    return { left: c.left, top: c.top, right: c.right, bottom: c.bottom }
  })
  expect(r.left).toBeLessThanOrEqual(f.x)
  expect(r.right).toBeGreaterThanOrEqual(f.x + f.width)
  expect(r.top).toBeLessThanOrEqual(f.y)
  expect(r.bottom).toBeGreaterThanOrEqual(f.y + f.height)
})
