import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { abrir, comoUsuarioConocido } from './ayudas.ts'

// Clima simulado (adaptar-ruta-al-clima), con Aula 309 → Aula 103. Los chips de alternativas,
// la tarjeta y la ruta dibujada son de `mostrar-ruta-e-indicaciones`: acá se ve la línea del clima
// y, con el clima caído, la elección del criterio.

const LLUEVE = 'Llueve · te recomendamos la ruta más resguardada'
const SECO = 'No llueve · ruta más rápida'
const PREGUNTA = 'No pudimos consultar el clima. ¿Cómo querés ir?'

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

/** Abre la app con `busqueda` y pide la ruta del Aula 309 al Aula 103. */
async function pedirRuta(page: Page, busqueda: string) {
  await abrir(page, `/${busqueda}`)
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await page.getByRole('combobox').fill('103')
  await page.getByRole('option', { name: /^Aula 103/ }).tap()
  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await page.getByRole('button', { name: /^Punto de partida/ }).tap()
  await page.getByRole('combobox').fill('309')
  await page.getByRole('option', { name: /^Aula 309/ }).tap()
  await expect(page.getByTestId('contenido-ruta')).toBeVisible()
}

test('?clima=lluvia: recomienda la ruta más resguardada', async ({ page }) => {
  await pedirRuta(page, '?clima=lluvia')
  await expect(page.getByText(LLUEVE)).toBeVisible()
  await expect(page.getByText(PREGUNTA)).toHaveCount(0)

  // Comparación visible en los chips y "Más rápida" a un toque.
  const chips = page.getByRole('list', { name: 'Opciones de ruta' })
  const resguardada = chips.getByRole('button', { name: /^Más resguardada · 8 min/ })
  const rapida = chips.getByRole('button', { name: /^Más rápida · 5 min/ })
  await expect(resguardada).toHaveAttribute('aria-pressed', 'true')
  await expect(resguardada).toContainText(
    '120 m al aire libre · +3 min · 150 m menos al aire libre',
  )
  await expect(rapida).toContainText('270 m al aire libre')
  await rapida.tap()
  await expect(rapida).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByTestId('ruta-resumen')).toContainText('5 min')
})

test('?clima=seco: solo la más rápida, sin elección', async ({ page }) => {
  await pedirRuta(page, '?clima=seco')
  await expect(page.getByText(SECO)).toBeVisible()
  await expect(page.getByRole('group', { name: '¿Cómo querés ir?' })).toHaveCount(0)
})

test('?clima=error: avisa y pide elegir sin preseleccionar; la elección sobrevive a Reintentar', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=error')
  await expect(page.getByText(PREGUNTA)).toBeVisible()
  const opciones = page.getByRole('group', { name: '¿Cómo querés ir?' })
  const resguardada = opciones.getByRole('button', { name: /^Más resguardada/ })
  const rapida = opciones.getByRole('button', { name: /^Más rápida/ })
  await expect(resguardada).toHaveAttribute('aria-pressed', 'false')
  await expect(rapida).toHaveAttribute('aria-pressed', 'false')
  await expect(resguardada).toContainText('+3 min · 150 m menos al aire libre')
  await expect(rapida).toContainText('5 min · 270 m al aire libre')
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeVisible()

  await resguardada.tap()
  await expect(resguardada).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText('No pudimos consultar el clima', { exact: true })).toBeVisible()

  // Reintentar con el servicio todavía caído: no vuelve a preguntar.
  await page.getByRole('button', { name: 'Reintentar' }).tap()
  await expect(page.getByRole('button', { name: 'Reintentar' })).toBeEnabled()
  await expect(resguardada).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByText(PREGUNTA)).toHaveCount(0)
})

test('?clima=lento: "Buscando el camino…" y a los 3 s la recomendación con lluvia', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=lento')
  await expect(page.getByTestId('contenido-ruta')).toContainText('Buscando el camino…')
  await expect(page.getByText(LLUEVE)).toHaveCount(0)
  await expect(page.getByText(LLUEVE)).toBeVisible({ timeout: 6000 })
})

test('panel de prueba: el toque corto abre la ayuda, 3 s abren el panel y cambiar a Lluvia actualiza la ruta', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=seco')
  await expect(page.getByText(SECO)).toBeVisible()

  const ayuda = page.getByRole('button', { name: 'Ayuda' })
  await ayuda.tap()
  await expect(page.getByRole('dialog', { name: 'Panel de prueba' })).toHaveCount(0)
  await page.goBack() // cierra la ayuda
  await expect(page.getByText(SECO)).toBeVisible()

  // La hoja se ajusta al alto de la ruta con una transición y los botones la acompañan: se mide
  // el botón recién cuando dejó de moverse.
  await expect
    .poll(async () => {
      const antes = (await ayuda.boundingBox())!.y
      await page.waitForTimeout(100)
      return (await ayuda.boundingBox())!.y === antes
    })
    .toBe(true)
  const caja = (await ayuda.boundingBox())!
  await page.mouse.move(caja.x + caja.width / 2, caja.y + caja.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(3200)
  await page.mouse.up()
  const panel = page.getByRole('dialog', { name: 'Panel de prueba' })
  await expect(panel).toBeVisible()
  await expect(panel.getByRole('radio', { name: 'Seco' })).toBeChecked()

  await panel.getByText('Lluvia', { exact: true }).click()
  await expect(panel.getByRole('radio', { name: 'Lluvia' })).toBeChecked()
  await panel.getByRole('button', { name: 'Cerrar', exact: true }).click()
  await expect(page.getByText(LLUEVE)).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Punto de partida: Aula 309. Cambiar' }),
  ).toBeVisible()
  expect(await page.evaluate(() => sessionStorage.getItem('donde-queda:clima'))).toBe('lluvia')

  // Recarga sin parámetros: el escenario sigue en la sesión.
  await page.goto('/?panel=prueba')
  await expect(
    page.getByRole('dialog', { name: 'Panel de prueba' }).getByRole('radio', { name: 'Lluvia' }),
  ).toBeChecked()
})
