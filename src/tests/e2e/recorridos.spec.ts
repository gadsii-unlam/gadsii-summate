import { expect, test } from '@playwright/test'
import { abrir, comoUsuarioConocido } from './ayudas.ts'

// Recorridos sin gestos: corren en `movil` (Chromium) y en `webkit`.

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

test('inicio → "121" → ficha → Cómo llegar → Biblioteca como origen pide la ruta; Atrás vuelve por cada capa', async ({
  page,
}) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await expect(page.getByRole('combobox')).toBeFocused()
  await page.getByRole('combobox').fill('121')
  await page.getByRole('option', { name: /^Aula 121/ }).tap()
  await expect(page.getByRole('heading', { level: 2, name: 'Aula 121' })).toBeFocused()

  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await expect(page.getByRole('button', { name: 'Destino: Aula 121. Cambiar' })).toBeVisible()
  await page.getByRole('button', { name: /^Punto de partida/ }).tap()
  await expect(page.getByRole('heading', { name: '¿Desde dónde salís?' })).toBeVisible()
  await page.getByRole('option', { name: /^Biblioteca/ }).tap()

  // Se pidió la ruta: la hoja muestra el lugar reservado del resultado.
  await expect(
    page.getByRole('button', { name: 'Punto de partida: Biblioteca Leopoldo Marechal. Cambiar' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: Aula 121. Cambiar' })).toBeVisible()
  await expect(page.getByTestId('contenido-ruta')).toBeVisible()
  await expect(page).toHaveURL(/#como-llegar$/)

  await page.goBack()
  await expect(page.getByRole('heading', { level: 2, name: 'Aula 121' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('combobox')).toHaveValue('121')
  await page.goBack()
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
  await expect(page).toHaveURL(/\/$/)
})

test('la barra pide primero el origen y después el destino; Atrás vuelve al panel y al inicio', async ({
  page,
}) => {
  await abrir(page)
  await page.getByRole('button', { name: /^¿Desde dónde salís\?/ }).tap()
  await expect(page.getByRole('dialog', { name: 'Elegir punto de partida' })).toBeVisible()
  await page.getByRole('combobox').fill('biblio')
  await page.getByRole('option', { name: /^Biblioteca/ }).tap()
  await expect(page.getByRole('dialog', { name: 'Buscar lugar' })).toBeVisible()
  await expect(page.getByRole('combobox')).toBeFocused()
  await page.getByRole('combobox').fill('121')
  await page.getByRole('option', { name: /^Aula 121/ }).tap()
  await expect(
    page.getByRole('button', { name: 'Punto de partida: Biblioteca Leopoldo Marechal. Cambiar' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: Aula 121. Cambiar' })).toBeVisible()
  await expect(page.getByTestId('contenido-ruta')).toBeVisible()
  await expect(page).toHaveURL(/#como-llegar$/)
  await page.goBack()
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
})

test('Atrás con la búsqueda abierta vuelve al inicio con el mapa', async ({ page }) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await expect(page.getByRole('dialog', { name: 'Buscar lugar' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Mapa del campus' })).toBeVisible()
})

test('enlace directo a #lugar/puerta-aula-121: ficha, y Atrás muestra el inicio', async ({
  page,
}) => {
  await abrir(page, '/#lugar/puerta-aula-121')
  await expect(page.getByRole('heading', { level: 2, name: 'Aula 121' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
  await expect(page.getByRole('heading', { level: 2, name: 'Aula 121' })).toHaveCount(0)
  expect(new URL(page.url()).pathname).toBe('/')
})

test('un hash desconocido abre el inicio', async ({ page }) => {
  await abrir(page, '/#cualquier-cosa')
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
})

test('elegir un lugar en un campo del panel actualiza solo ese campo', async ({ page }) => {
  await abrir(page)
  await page.getByRole('button', { name: 'Biblioteca Leopoldo Marechal', exact: true }).tap()
  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await page
    .locator('.hoja')
    .getByRole('button', { name: /^Entrada Florencio Varela/ })
    .tap()
  const origen = page.getByRole('button', {
    name: 'Punto de partida: Entrada Florencio Varela. Cambiar',
  })
  await expect(origen).toBeVisible()

  await page.getByRole('button', { name: 'Destino: Biblioteca Leopoldo Marechal. Cambiar' }).tap()
  await page.getByRole('combobox').fill('302')
  await page.getByRole('option', { name: /^Aula 302/ }).tap()
  await expect(page.getByRole('button', { name: 'Destino: Aula 302. Cambiar' })).toBeVisible()
  await expect(origen).toBeVisible()

  await origen.tap()
  await page.getByRole('combobox').fill('teatro')
  await page.getByRole('option', { name: /^Teatro/ }).tap()
  await expect(
    page.getByRole('button', { name: 'Punto de partida: Teatro. Cambiar' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: Aula 302. Cambiar' })).toBeVisible()
})

test('la ayuda se abre desde el inicio, la ficha y el panel; Atrás la cierra sin cambiar la selección', async ({
  page,
}) => {
  await abrir(page)
  const ayuda = page.getByRole('dialog', { name: 'Cómo usar ¿Dónde queda?' })

  await page.getByRole('button', { name: 'Ayuda', exact: true }).tap()
  await expect(ayuda).toBeVisible()
  await expect(ayuda.getByText('La app no usa tu ubicación', { exact: false })).toBeVisible()
  await page.goBack()
  await expect(ayuda).toHaveCount(0)

  await page.getByRole('button', { name: 'Teatro', exact: true }).tap()
  await page.getByRole('button', { name: 'Ayuda', exact: true }).tap()
  await expect(ayuda).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar la ayuda' }).tap()
  await expect(page.getByRole('heading', { level: 2, name: 'Teatro' })).toBeVisible()

  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await page
    .locator('.hoja')
    .getByRole('button', { name: /^Biblioteca/ })
    .tap()
  await page.getByRole('button', { name: 'Ayuda', exact: true }).tap()
  await expect(ayuda).toBeVisible()
  await expect(page).toHaveURL(/#ayuda$/)
  await page.goBack()
  await expect(ayuda).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Punto de partida: Biblioteca Leopoldo Marechal. Cambiar' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: Teatro. Cambiar' })).toBeVisible()
})

test('con la hoja colapsada el foco nunca cae en contenido oculto', async ({ page }) => {
  await abrir(page)
  await expect(page.locator('.hoja')).toHaveAttribute('data-altura', 'colapsada')
  await expect(page.locator('.hoja__cuerpo')).toHaveAttribute('inert', '')
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(350)
    const r = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const c = el.getBoundingClientRect()
      return { arriba: c.top, alto: window.innerHeight, inert: !!el.closest('[inert]') }
    })
    if (!r) continue
    // Si el foco va a algo que estaba abajo, la hoja se expande: nunca queda fuera de la vista.
    expect(r.inert).toBe(false)
    expect(r.arriba).toBeLessThan(r.alto)
  }
})
