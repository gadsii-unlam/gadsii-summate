import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { abrir, comoUsuarioConocido, elegirRecorrido } from './ayudas.ts'

// Clima simulado (adaptar-ruta-al-clima), con Aula 309 → Aula 103. En celular la línea del clima
// («Llueve…» / «No llueve…») queda en el DOM pero no se muestra: debajo de la tarjeta solo aparece
// la pregunta «¿Cómo querés ir?» cuando falla el clima, y se va al elegir una opción.

const LLUEVE = 'Llueve · te recomendamos la ruta más resguardada'
const SECO = 'No llueve · ruta más rápida'
const PREGUNTA = 'No pudimos consultar el clima. ¿Cómo querés ir?'

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

const mapa = (page: Page) => page.locator('.mapa')
const avisoClima = (page: Page) => page.locator('.avisos-arriba__clima')

/** Abre la app con `busqueda` y pide la ruta del Aula 309 al Aula 103. */
async function pedirRuta(page: Page, busqueda: string) {
  await abrir(page, `/${busqueda}`)
  await elegirRecorrido(page, ['103', /^Aula 103/], ['309', /^Aula 309/])
  await expect(page.getByTestId('contenido-ruta')).toBeAttached()
}

test('?clima=lluvia: recomienda la ruta más resguardada y deja la más rápida en gris', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=lluvia')
  await expect(page.getByText(LLUEVE)).toBeAttached()
  await expect(page.getByText(PREGUNTA)).toHaveCount(0)
  await expect(avisoClima(page)).toBeHidden()
  await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /puerta-/)
  await expect(mapa(page)).toHaveAttribute('data-ruta-alternativa', /.+/)
  await expect(page.getByTestId('ruta-resultado').locator('[role="status"]')).toContainText(
    'Ruta encontrada: 7 min',
  )
})

test('?clima=seco: solo la más rápida, sin elección ni alternativa', async ({ page }) => {
  await pedirRuta(page, '?clima=seco')
  await expect(page.getByText(SECO)).toBeAttached()
  await expect(page.getByRole('group', { name: '¿Cómo querés ir?' })).toHaveCount(0)
  await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /puerta-/)
  await expect(mapa(page)).not.toHaveAttribute('data-ruta-alternativa', /.+/)
})

test('?clima=error: pregunta debajo de la tarjeta sin preseleccionar; al elegir se va y queda la ruta', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=error')
  await expect(page.getByText(PREGUNTA)).toBeVisible()
  const opciones = page.getByRole('group', { name: '¿Cómo querés ir?' })
  const resguardada = opciones.getByRole('button', { name: /^Más resguardada/ })
  const rapida = opciones.getByRole('button', { name: /^Más rápida/ })
  await expect(resguardada).toHaveAttribute('aria-pressed', 'false')
  await expect(rapida).toHaveAttribute('aria-pressed', 'false')
  // En celular, sin tiempos ni "Reintentar" (la barra "Sin conexión" ya lo ofrece).
  await expect(avisoClima(page).getByRole('button', { name: 'Reintentar' })).toBeHidden()
  await expect(mapa(page)).not.toHaveAttribute('data-ruta-nodos', /.+/)

  await resguardada.tap()
  await expect(avisoClima(page)).toBeHidden()
  await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /puerta-/)
})

test('?clima=lento: "Buscando el camino…" y a los 3 s la recomendación con lluvia', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=lento')
  await expect(page.getByTestId('contenido-ruta')).toContainText('Buscando el camino…')
  await expect(page.getByText(LLUEVE)).toHaveCount(0)
  await expect(page.getByText(LLUEVE)).toBeAttached({ timeout: 6000 })
  await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /puerta-/)
})

test('panel de prueba: el toque corto abre la ayuda, 3 s abren el panel y cambiar a Lluvia actualiza la ruta', async ({
  page,
}) => {
  await pedirRuta(page, '?clima=seco')
  await expect(page.getByText(SECO)).toBeAttached()

  const ayuda = page.getByRole('button', { name: 'Ayuda' })
  await ayuda.tap()
  await expect(page.getByRole('dialog', { name: 'Panel de prueba' })).toHaveCount(0)
  await page.goBack() // cierra la ayuda
  await expect(page.getByText(SECO)).toBeAttached()

  // Se mide el botón recién cuando dejó de moverse.
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
  await expect(page.getByText(LLUEVE)).toBeAttached()
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
