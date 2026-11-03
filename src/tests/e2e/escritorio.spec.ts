import { expect, test } from '@playwright/test'
import { abrir, caja, comoUsuarioConocido } from './ayudas.ts'

const CAPTURAS = 'test-results/capturas'

test.describe('escritorio 1280 × 800', () => {
  test.use({
    viewport: { width: 1280, height: 800 },
    isMobile: false,
    hasTouch: false,
    deviceScaleFactor: 1,
  })

  test('la hoja es un panel lateral izquierdo de 408 px con la búsqueda dentro y controles de zoom', async ({
    page,
  }) => {
    await comoUsuarioConocido(page)
    await abrir(page)
    const hoja = page.locator('.hoja')
    await expect(hoja).toHaveAttribute('data-altura', 'panel')
    await expect(page.locator('.hoja__manija')).toHaveCount(0)
    expect(await caja(page, '.hoja')).toMatchObject({ x: 0, y: 0, width: 408, height: 800 })
    const tarjeta = await caja(page, '.tarjeta-superior')
    expect(tarjeta.x + tarjeta.width).toBeLessThanOrEqual(408)
    await expect(page.getByRole('button', { name: 'Acercar' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Alejar' })).toBeVisible()
    await page.screenshot({ path: `${CAPTURAS}/escritorio-1280x800.png` })

    await page.getByRole('button', { name: 'Entradas', exact: true }).click()
    const busqueda = await caja(page, '.busqueda')
    expect(busqueda).toMatchObject({ x: 0, width: 408 })
    await page.getByRole('combobox').fill('121')
    await page.keyboard.press('Enter')
    await expect(page.getByRole('heading', { level: 2, name: 'Aula 121' })).toBeVisible()
    await page.screenshot({ path: `${CAPTURAS}/escritorio-ficha.png` })
    // `Esc` en escritorio cierra la última capa.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('combobox')).toHaveValue('121')
  })

  test('el mapa responde al teclado', async ({ page }) => {
    await abrir(page)
    const z = Number(await page.locator('.mapa').getAttribute('data-zoom'))
    await page.locator('.mapa').focus()
    await page.keyboard.press('+')
    await expect
      .poll(async () => Number(await page.locator('.mapa').getAttribute('data-zoom')))
      .toBeGreaterThan(z)
  })
})

test.describe('tableta 768 × 1024', () => {
  test.use({ viewport: { width: 768, height: 1024 } })

  test('usa la hoja móvil, de 560 px como máximo y pegada a la izquierda', async ({ page }) => {
    await comoUsuarioConocido(page)
    await abrir(page)
    await expect(page.locator('.hoja')).toHaveAttribute('data-altura', 'colapsada')
    const hoja = await caja(page, '.hoja')
    expect(hoja.width).toBeLessThanOrEqual(560)
    expect(hoja.x).toBe(16)
    await page.screenshot({ path: `${CAPTURAS}/tableta-768x1024.png` })
  })
})
