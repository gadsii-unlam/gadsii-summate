/** Ayudas compartidas por los tests e2e de la interfaz. */
import { expect } from '@playwright/test'
import type { Page } from '@playwright/test'

/** Usuario que ya cerró la indicación de primer uso y tiene un reciente (la hoja abre colapsada). */
export async function comoUsuarioConocido(page: Page) {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('dq-e2e-preparado')) return
    sessionStorage.setItem('dq-e2e-preparado', '1')
    localStorage.setItem('dq:primer-uso-cerrado:v1', 'true')
    localStorage.setItem('dq:recientes:v1', JSON.stringify([{ id: 'teatro', cuando: 1 }]))
  })
}

/** Espera a que el plano vectorial (`mapa-base.svg`) esté cargado y a la vista. */
export async function esperarPlano(page: Page) {
  const plano = page.locator('img.mapa__plano')
  await expect(plano).toBeVisible()
  await expect
    .poll(() => plano.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0))
    .toBe(true)
}

/** Abre la app y espera a que el plano esté cargado y el encuadre inicial. */
export async function abrir(page: Page, ruta = '/') {
  await page.goto(ruta)
  await esperarPlano(page)
  await esperarMapaQuieto(page)
}

export interface EstadoMapa {
  zoom: number
  zoomMinimo: number
  x: number
  y: number
}

export async function estadoMapa(page: Page): Promise<EstadoMapa> {
  const d = await page.locator('.mapa').evaluate((el: HTMLElement) => ({ ...el.dataset }))
  const [x, y] = (d.centro ?? '0,0').split(',').map(Number)
  return { zoom: Number(d.zoom), zoomMinimo: Number(d.zoomMinimo), x: x ?? 0, y: y ?? 0 }
}

/** Espera a que el mapa deje de moverse (dos lecturas iguales seguidas). */
export async function esperarMapaQuieto(page: Page) {
  let previo = ''
  for (let i = 0; i < 40; i++) {
    await page.waitForTimeout(150)
    const actual = JSON.stringify(await estadoMapa(page))
    if (actual === previo) return
    previo = actual
  }
}

interface Punto {
  x: number
  y: number
}

/** Arrastra un dedo con eventos táctiles de CDP (solo Chromium). */
export async function arrastrar(
  page: Page,
  desde: Punto,
  hasta: Punto,
  pasos = 12,
  msPorPaso = 16,
) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...desde, id: 1 }],
  })
  for (let i = 1; i <= pasos; i++) {
    const t = i / pasos
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        { x: desde.x + (hasta.x - desde.x) * t, y: desde.y + (hasta.y - desde.y) * t, id: 1 },
      ],
    })
    await page.waitForTimeout(msPorPaso)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

/** Pellizca con dos dedos alrededor de `centro`, de una separación a otra (solo Chromium). */
export async function pellizcar(
  page: Page,
  centro: Punto,
  desde: number,
  hasta: number,
  pasos = 10,
) {
  const cdp = await page.context().newCDPSession(page)
  const dedos = (d: number) => [
    { x: centro.x - d / 2, y: centro.y, id: 1 },
    { x: centro.x + d / 2, y: centro.y, id: 2 },
  ]
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: dedos(desde) })
  for (let i = 1; i <= pasos; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: dedos(desde + ((hasta - desde) * i) / pasos),
    })
    await page.waitForTimeout(16)
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
  await cdp.detach()
}

/** Dos toques rápidos en el mismo punto (solo Chromium). */
export async function dobleToque(page: Page, p: Punto) {
  const cdp = await page.context().newCDPSession(page)
  for (let i = 0; i < 2; i++) {
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ ...p, id: 1 }],
    })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })
    await page.waitForTimeout(80)
  }
  await cdp.detach()
}

export async function caja(page: Page, selector: string) {
  const c = await page.locator(selector).first().boundingBox()
  if (!c) throw new Error(`sin caja: ${selector}`)
  return c
}
