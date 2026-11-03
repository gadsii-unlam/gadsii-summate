import { expect, test } from '@playwright/test'
import { abrir, comoUsuarioConocido, esperarMapaQuieto, esperarPlano } from './ayudas.ts'

// Capturas de referencia de las cuatro vistas de design.md (D1) a 390 × 844.
const opciones = { maxDiffPixelRatio: 0.02, animations: 'disabled' as const }

test('capturas de referencia: inicio, búsqueda, ficha y Cómo llegar', async ({ page }) => {
  // Las referencias dependen del sistema operativo (fuentes): están generadas en macOS.
  // En CI (Linux) no hay referencia todavía; se generan con `--update-snapshots` en ese runner.
  test.skip(!!process.env.CI, 'Referencias de píxeles generadas en macOS')
  await comoUsuarioConocido(page)
  await abrir(page)
  await expect(page).toHaveScreenshot('1-inicio.png', opciones)

  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await page.getByRole('combobox').fill('lab fis')
  await expect(page).toHaveScreenshot('2-busqueda.png', { ...opciones, caret: 'hide' })

  await page.getByRole('combobox').fill('121')
  await page.getByRole('option', { name: /^Aula 121/ }).tap()
  await esperarMapaQuieto(page)
  await esperarPlano(page)
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('3-ficha.png', opciones)

  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await esperarMapaQuieto(page)
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('4-como-llegar.png', opciones)
})
