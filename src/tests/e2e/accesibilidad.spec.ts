import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { abrir, comoUsuarioConocido } from './ayudas.ts'

async function graves(page: Page) {
  const r = await new AxeBuilder({ page }).analyze()
  return r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

test('sin violaciones serias ni críticas en inicio, búsqueda, ficha, Cómo llegar y ayuda', async ({
  page,
}) => {
  await comoUsuarioConocido(page)
  await abrir(page)
  expect(await graves(page), 'inicio').toEqual([])

  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await page.getByRole('combobox').fill('12')
  expect(await graves(page), 'búsqueda').toEqual([])

  await page.getByRole('option', { name: /^Aula 121/ }).tap()
  await page.waitForTimeout(400)
  expect(await graves(page), 'ficha').toEqual([])

  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  expect(await graves(page), 'Cómo llegar').toEqual([])
  await page
    .locator('.hoja')
    .getByRole('button', { name: /^Entrada Florencio Varela/ })
    .tap()
  expect(await graves(page), 'Cómo llegar con ruta').toEqual([])

  await page.getByRole('button', { name: 'Ayuda', exact: true }).tap()
  expect(await graves(page), 'ayuda').toEqual([])
})

test('primer uso sin violaciones serias ni críticas', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Entendido' })).toBeVisible()
  expect(await graves(page)).toEqual([])
})
