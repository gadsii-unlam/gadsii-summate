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

  test('la hoja es un panel lateral fijo de 408 px con "Cómo llegar" dentro y controles de zoom', async ({
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

    // El campo que falta es un cuadro de texto y las opciones van en el panel.
    const origen = page.getByRole('textbox', { name: /^Punto de partida/ })
    await expect(origen).toBeVisible()
    await origen.fill('biblio')
    await hoja.getByRole('button', { name: /^Biblioteca/ }).click()
    const destino = page.getByRole('textbox', { name: /^Destino/ })
    await destino.fill('121')
    await hoja.getByRole('button', { name: /^Aula 121/ }).click()
    await expect(page.locator('.mapa')).toHaveAttribute('data-ruta-nodos', /puerta-/)
    await expect(hoja.getByRole('button', { name: 'Cancelar', exact: true })).toBeVisible()
    await page.screenshot({ path: `${CAPTURAS}/escritorio-ruta.png` })
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

  test('usa la disposición de celular: sin hoja inferior', async ({ page }) => {
    await comoUsuarioConocido(page)
    await abrir(page)
    await expect(page.locator('.hoja')).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Cambiar altura del panel' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^Destino:/ })).toBeVisible()
    await page.screenshot({ path: `${CAPTURAS}/tableta-768x1024.png` })
  })
})
