import { expect, test } from '@playwright/test'

test('abre la app y muestra la pantalla mínima sin scroll horizontal', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle('¿Dónde queda?')
  await expect(page.getByRole('heading', { level: 1, name: '¿Dónde queda?' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('lang', 'es-AR')

  const anchos = await page.evaluate(() => ({
    documento: document.documentElement.scrollWidth,
    ventana: window.innerWidth,
  }))
  expect(anchos.ventana).toBe(390)
  expect(anchos.documento).toBeLessThanOrEqual(anchos.ventana)
})
