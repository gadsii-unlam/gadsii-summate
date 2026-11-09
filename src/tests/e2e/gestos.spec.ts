import { expect, test } from '@playwright/test'
import {
  abrir,
  arrastrar,
  caja,
  comoUsuarioConocido,
  dobleToque,
  esperarMapaQuieto,
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

  test('recentrar vuelve al encuadre inicial en el inicio y al lugar en la ficha', async ({
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

    await page.getByRole('button', { name: 'Teatro', exact: true }).tap()
    await esperarMapaQuieto(page)
    await arrastrar(page, { x: 100, y: 150 }, { x: 350, y: 400 }, 10)
    await esperarMapaQuieto(page)
    await page.getByRole('button', { name: 'Recentrar el mapa' }).tap()
    await esperarMapaQuieto(page)
    const pin = await caja(page, '.mapa__pin')
    const tarjeta = await caja(page, '.tarjeta-superior')
    const hoja = await caja(page, '.hoja')
    expect(pin.y).toBeGreaterThan(tarjeta.y + tarjeta.height)
    expect(pin.y + pin.height).toBeLessThan(hoja.y)
  })

  test('el pin de un lugar lejano queda por encima de la hoja y desaparece al cerrar la ficha', async ({
    page,
  }) => {
    // Acercar sobre el sur del campus: la Entrada La Paz (arriba de todo) queda fuera de la vista.
    await pellizcar(page, { x: 195, y: 600 }, 60, 300)
    await esperarMapaQuieto(page)
    await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
    await page.getByRole('combobox').fill('la paz')
    await page.getByRole('option', { name: /^Entrada La Paz/ }).tap()
    await esperarMapaQuieto(page)
    const pin = await caja(page, '.mapa__pin')
    const tarjeta = await caja(page, '.tarjeta-superior')
    const hoja = await caja(page, '.hoja')
    expect(pin.y).toBeGreaterThan(tarjeta.y + tarjeta.height)
    expect(pin.y + pin.height).toBeLessThan(hoja.y)
    await expect(page.locator('.mapa__pin')).toHaveAttribute('aria-hidden', 'true')

    await page.getByRole('button', { name: 'Cerrar', exact: true }).tap()
    await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
    await expect(page.locator('.mapa__pin')).toHaveCount(0)
  })
})

test.describe('hoja inferior', () => {
  async function arribaDeLaHoja(page: import('@playwright/test').Page) {
    await page.waitForTimeout(400)
    return (await caja(page, '.hoja')).y
  }

  test('arrastrar la manija un poco más de la mitad hacia la media y soltar ancla en media', async ({
    page,
  }) => {
    const hoja = page.locator('.hoja')
    await expect(hoja).toHaveAttribute('data-altura', 'colapsada')
    const manija = await caja(page, '.hoja__manija')
    // Colapsada 96 px, media 422 px: la mitad está a 163 px; se arrastra 200 px despacio.
    const y = manija.y + manija.height / 2
    await arrastrar(page, { x: 195, y }, { x: 195, y: y - 200 }, 25, 30)
    await expect(hoja).toHaveAttribute('data-altura', 'media')
    expect(await arribaDeLaHoja(page)).toBeCloseTo(844 - 422, -1)
  })

  test('un deslizamiento rápido desde la media ancla en la expandida aunque el recorrido sea corto', async ({
    page,
  }) => {
    const hoja = page.locator('.hoja')
    await page.getByRole('button', { name: 'Cambiar altura del panel' }).press('Enter')
    await expect(hoja).toHaveAttribute('data-altura', 'media')
    await page.waitForTimeout(400)
    const manija = await caja(page, '.hoja__manija')
    const y = manija.y + manija.height / 2
    await arrastrar(page, { x: 195, y }, { x: 195, y: y - 70 }, 4, 8)
    await expect(hoja).toHaveAttribute('data-altura', 'expandida')
  })

  test('expandida con la lista arriba de todo, arrastrar hacia abajo baja la hoja a media', async ({
    page,
  }) => {
    const hoja = page.locator('.hoja')
    const manija = page.getByRole('button', { name: 'Cambiar altura del panel' })
    await manija.press('Enter')
    await manija.press('Enter')
    await expect(hoja).toHaveAttribute('data-altura', 'expandida')
    await page.waitForTimeout(400)
    const cuerpo = await caja(page, '.hoja__cuerpo')
    await arrastrar(page, { x: 195, y: cuerpo.y + 60 }, { x: 195, y: cuerpo.y + 300 }, 20, 30)
    await expect(hoja).toHaveAttribute('data-altura', 'media')
  })
})
