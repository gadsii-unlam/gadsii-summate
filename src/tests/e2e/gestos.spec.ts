import { expect, test } from '@playwright/test'
import {
  abrir,
  arrastrar,
  caja,
  comoUsuarioConocido,
  dobleToque,
  elegirDestino,
  elegirRecorrido,
  esperarMapaQuieto,
  franjaMapa,
  estadoMapa,
  pellizcar,
} from './ayudas.ts'

// Gestos con eventos táctiles de CDP: solo Chromium (proyecto `movil`).

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
  await abrir(page)
})

test.describe('página', () => {
  test('arrastrar hacia abajo no scrollea la página ni recarga', async ({ page }) => {
    await page.evaluate(() => ((window as unknown as { marca: number }).marca = 42))
    await arrastrar(page, { x: 200, y: 200 }, { x: 200, y: 700 }, 20)
    const tarjeta = await caja(page, '.tarjeta-superior')
    await arrastrar(page, { x: 200, y: tarjeta.y + 5 }, { x: 200, y: 600 }, 20)
    await page.waitForTimeout(600)
    const r = await page.evaluate(() => ({
      marca: (window as unknown as { marca?: number }).marca,
      scroll: [window.scrollY, document.scrollingElement?.scrollTop ?? 0],
    }))
    expect(r.marca).toBe(42)
    expect(r.scroll).toEqual([0, 0])
  })
})

test.describe('mapa', () => {
  test('pellizcar acerca y doble toque acerca un nivel', async ({ page }) => {
    const antes = await estadoMapa(page)
    await pellizcar(page, { x: 195, y: 400 }, 60, 260)
    await esperarMapaQuieto(page)
    const despues = await estadoMapa(page)
    expect(despues.zoom).toBeGreaterThan(antes.zoom)

    await dobleToque(page, { x: 195, y: 400 })
    await esperarMapaQuieto(page)
    expect((await estadoMapa(page)).zoom).toBeGreaterThan(despues.zoom + 0.5)
  })

  test('alejar se frena con el campus entero visible', async ({ page }) => {
    for (let i = 0; i < 4; i++) {
      await pellizcar(page, { x: 195, y: 400 }, 300, 40)
      await esperarMapaQuieto(page)
    }
    const e = await estadoMapa(page)
    expect(e.zoom).toBe(e.zoomMinimo)
    // A ese zoom el plano entero (1587,4 × 3004,7) entra en 390 × 844.
    const escala = 2 ** e.zoom
    expect(1587.4 * escala).toBeLessThanOrEqual(390)
    expect(3004.7 * escala).toBeLessThanOrEqual(844)
  })

  test('arrastrar más allá del borde se detiene y el campus no sale de la pantalla', async ({
    page,
  }) => {
    for (let i = 0; i < 6; i++) {
      await arrastrar(page, { x: 30, y: 400 }, { x: 370, y: 400 }, 10)
    }
    await esperarMapaQuieto(page)
    const e = await estadoMapa(page)
    // `maxBounds` = plano con 10 % de margen: el centro no puede salir de ahí.
    expect(e.x).toBeGreaterThanOrEqual(-158.8)
    const planoVisible = await page.locator('img.mapa__plano').evaluate((img) => {
      const r = img.getBoundingClientRect()
      return r.right > 0 && r.left < window.innerWidth && r.bottom > 0 && r.top < window.innerHeight
    })
    expect(planoVisible).toBe(true)
  })

  test('recentrar vuelve al encuadre inicial en el panel vacío y al destino elegido', async ({
    page,
  }) => {
    const inicial = await estadoMapa(page)
    await arrastrar(page, { x: 100, y: 300 }, { x: 350, y: 650 }, 10)
    await esperarMapaQuieto(page)
    expect(Math.abs((await estadoMapa(page)).y - inicial.y)).toBeGreaterThan(100)
    await page.getByRole('button', { name: 'Recentrar el mapa' }).tap()
    await esperarMapaQuieto(page)
    const vuelta = await estadoMapa(page)
    expect(vuelta.zoom).toBeCloseTo(inicial.zoom, 1)
    expect(Math.abs(vuelta.x - inicial.x)).toBeLessThan(5)
    expect(Math.abs(vuelta.y - inicial.y)).toBeLessThan(5)

    await elegirDestino(page, 'teatro', /^Teatro/)
    await esperarMapaQuieto(page)
    await arrastrar(page, { x: 100, y: 250 }, { x: 350, y: 500 }, 10)
    await esperarMapaQuieto(page)
    await page.getByRole('button', { name: 'Recentrar el mapa' }).tap()
    await esperarMapaQuieto(page)
    const pin = await caja(page, '.mapa__pin')
    const f = await franjaMapa(page)
    expect(pin.y).toBeGreaterThan(f.arriba)
    expect(pin.y + pin.height).toBeLessThan(f.abajo)
  })

  test('el pin de un destino lejano queda en la franja visible y desaparece al borrarlo', async ({
    page,
  }) => {
    // Acercar sobre el sur del campus: la Entrada La Paz (arriba de todo) queda fuera de la vista.
    await pellizcar(page, { x: 195, y: 600 }, 60, 300)
    await esperarMapaQuieto(page)
    await elegirDestino(page, 'la paz', /^Entrada La Paz/)
    await esperarMapaQuieto(page)
    const pin = await caja(page, '.mapa__pin')
    const f = await franjaMapa(page)
    expect(pin.y).toBeGreaterThan(f.arriba)
    expect(pin.y + pin.height).toBeLessThan(f.abajo)
    await expect(page.locator('.mapa__pin')).toHaveAttribute('aria-hidden', 'true')

    await page.getByRole('button', { name: 'Borrar destino' }).tap()
    await expect(page.getByRole('button', { name: 'Destino: ¿A dónde vas?' })).toBeVisible()
    await expect(page.locator('.mapa__pin')).toHaveCount(0)
  })
})

test.describe('sin hoja inferior', () => {
  // En celular no hay ninguna pantalla con la parte de abajo deslizable: arrastrar desde el
  // borde de abajo mueve el mapa y no levanta ningún panel.
  for (const conRuta of [false, true]) {
    test(`arrastrar hacia arriba desde abajo solo mueve el mapa (${conRuta ? 'con ruta' : 'panel vacío'})`, async ({
      page,
    }) => {
      if (conRuta) {
        await elegirRecorrido(page, ['teatro', /^Teatro/], ['biblio', /^Biblioteca/])
        await expect(page.locator('.mapa')).toHaveAttribute('data-ruta-nodos', /puerta-|acceso-/)
        await esperarMapaQuieto(page)
      }
      await expect(page.locator('.hoja')).toHaveCount(0)
      const antes = await estadoMapa(page)
      // A la izquierda: lejos de los botones flotantes y de "Cancelar".
      await arrastrar(page, { x: 40, y: 820 }, { x: 40, y: 420 }, 20, 20)
      await esperarMapaQuieto(page)
      const despues = await estadoMapa(page)
      expect(Math.abs(despues.y - antes.y)).toBeGreaterThan(50)
      await expect(page.locator('.hoja')).toHaveCount(0)
      const r = await page.evaluate(() => [window.scrollY, document.scrollingElement?.scrollTop])
      expect(r).toEqual([0, 0])
    })
  }
})
