import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { abrir, comoUsuarioConocido, elegirOrigen } from './ayudas.ts'

async function graves(page: Page) {
  const r = await new AxeBuilder({ page }).analyze()
  return r.violations
    .filter((v) => v.impact === 'serious' || v.impact === 'critical')
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)
}

test('sin violaciones serias ni críticas en el panel, la búsqueda (con recientes), con ruta y en la ayuda', async ({
  page,
}) => {
  await comoUsuarioConocido(page)
  await abrir(page)
  expect(await graves(page), 'panel vacío').toEqual([])

  await page.getByRole('button', { name: /^Destino:/ }).tap()
  expect(await graves(page), 'búsqueda con recientes').toEqual([])
  await page.getByRole('combobox').fill('12')
  expect(await graves(page), 'búsqueda').toEqual([])

  await page.getByRole('option', { name: /^Aula 121/ }).tap()
  await page.waitForTimeout(400)
  expect(await graves(page), 'con destino').toEqual([])

  await elegirOrigen(page, 'florencio', /^Entrada Florencio Varela/)
  await expect(page.locator('.mapa')).toHaveAttribute('data-ruta-nodos', /puerta-/)
  expect(await graves(page), 'con ruta').toEqual([])

  await page.getByRole('button', { name: 'Ayuda', exact: true }).tap()
  expect(await graves(page), 'ayuda').toEqual([])
})

test('primera visita (sin nada guardado) sin violaciones serias ni críticas', async ({ page }) => {
  await abrir(page)
  expect(await graves(page)).toEqual([])
})
