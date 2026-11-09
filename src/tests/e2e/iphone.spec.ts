import { expect, test } from '@playwright/test'
import { abrir, caja, comoUsuarioConocido } from './ayudas.ts'

// Solo WebKit. La emulación no da áreas seguras reales: se simulan las de un iPhone 14
// (47 px arriba, 34 px abajo) sobrescribiendo las variables que valen `env(safe-area-inset-*)`.
const ARRIBA = 47
const ABAJO = 34

test('la tarjeta superior y la hoja no quedan bajo la muesca ni la barra de inicio', async ({
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
  // La hoja colapsada mide 96 px + el área segura de abajo.
  const hoja = await caja(page, '.hoja')
  expect(844 - hoja.y).toBeGreaterThanOrEqual(96 + ABAJO - 1)
  const fila = await caja(page, '.hoja__cabecera .fila')
  expect(fila.y).toBeLessThan(844 - ABAJO)
  const botones = await caja(page, '.botones-flotantes')
  expect(botones.y + botones.height).toBeLessThanOrEqual(hoja.y)
  await page.screenshot({ path: 'test-results/capturas/iphone-areas-seguras.png' })

  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  const barra = await caja(page, '.busqueda__barra')
  expect(barra.y).toBeGreaterThanOrEqual(ARRIBA)
})

test('los campos de texto miden 16 px (Safari no hace zoom al enfocarlos)', async ({ page }) => {
  await comoUsuarioConocido(page)
  await abrir(page)
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  expect(await page.getByRole('combobox').evaluate((el) => getComputedStyle(el).fontSize)).toBe(
    '16px',
  )
})
