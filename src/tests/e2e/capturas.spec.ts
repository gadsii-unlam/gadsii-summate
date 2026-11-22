import { expect, test } from '@playwright/test'
import {
  abrir,
  comoUsuarioConocido,
  elegirOrigen,
  esperarMapaQuieto,
  esperarPlano,
} from './ayudas.ts'

// Capturas de referencia a 390 × 844: el panel "Cómo llegar" vacío (la vista de inicio), la
// búsqueda, con destino y con la ruta.
const opciones = { maxDiffPixelRatio: 0.02, animations: 'disabled' as const }

test('capturas de referencia: inicio, búsqueda, destino y ruta', async ({ page }) => {
  // Las referencias dependen del sistema operativo (fuentes): se generan en macOS con
  // `--update-snapshots`. En CI (Linux) no hay referencia todavía.
  test.skip(!!process.env.CI, 'Referencias de píxeles generadas en macOS')
  await comoUsuarioConocido(page)
  await abrir(page)
  await expect(page).toHaveScreenshot('1-inicio.png', opciones)

  await page.getByRole('button', { name: /^Destino:/ }).tap()
  await page.getByRole('combobox').fill('lab fis')
  await expect(page).toHaveScreenshot('2-busqueda.png', { ...opciones, caret: 'hide' })

  await page.getByRole('combobox').fill('121')
  await page.getByRole('option', { name: /^Aula 121/ }).tap()
  await esperarMapaQuieto(page)
  await esperarPlano(page)
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('3-destino.png', opciones)

  await elegirOrigen(page, 'biblio', /^Biblioteca/)
  await expect(page.locator('.mapa')).toHaveAttribute('data-ruta-nodos', /puerta-/)
  await esperarMapaQuieto(page)
  await page.waitForTimeout(500)
  await expect(page).toHaveScreenshot('4-como-llegar.png', opciones)
})
