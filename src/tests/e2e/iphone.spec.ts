import { expect, test } from '@playwright/test'
import { abrir, botonCancelar, caja, comoUsuarioConocido, elegirRecorrido } from './ayudas.ts'

// Solo WebKit. La emulación no da áreas seguras reales: se simulan las de un iPhone 14
// (47 px arriba, 34 px abajo) sobrescribiendo las variables que valen `env(safe-area-inset-*)`.
const ARRIBA = 47
const ABAJO = 34

test('la tarjeta superior, los botones y "Cancelar" no quedan bajo la muesca ni la barra de inicio', async ({
  page,
}) => {
  await comoUsuarioConocido(page)
  await page.addInitScript(
    ([a, b]) => {
      document.addEventListener('DOMContentLoaded', () => {
        const s = document.createElement('style')
        s.textContent = `:root{--seguro-arriba:${a}px !important;--seguro-abajo:${b}px !important}`
        document.head.appendChild(s)
      })
    },
    [ARRIBA, ABAJO],
  )
  await abrir(page)
  const tarjeta = await caja(page, '.tarjeta-superior')
  expect(tarjeta.y).toBeGreaterThanOrEqual(ARRIBA)
  // Sin hoja inferior: los botones flotan por encima de la barra de inicio.
  await expect(page.locator('.hoja')).toHaveCount(0)
  const botones = await caja(page, '.botones-flotantes')
  expect(botones.y + botones.height).toBeLessThanOrEqual(844 - ABAJO)

  await page.getByRole('button', { name: /^Destino:/ }).tap()
  const barra = await caja(page, '.busqueda__barra')
  expect(barra.y).toBeGreaterThanOrEqual(ARRIBA)
  await page.goBack()

  await elegirRecorrido(page, ['teatro', /^Teatro/], ['biblio', /^Biblioteca/])
  const cancelar = (await botonCancelar(page).boundingBox())!
  expect(cancelar.y + cancelar.height).toBeLessThanOrEqual(844 - ABAJO)
  await page.screenshot({ path: 'test-results/capturas/iphone-areas-seguras.png' })
})

test('los campos de texto miden 16 px (Safari no hace zoom al enfocarlos)', async ({ page }) => {
  await comoUsuarioConocido(page)
  await abrir(page)
  await page.getByRole('button', { name: /^Destino:/ }).tap()
  expect(await page.getByRole('combobox').evaluate((el) => getComputedStyle(el).fontSize)).toBe(
    '16px',
  )
})
