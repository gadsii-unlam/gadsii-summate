import { expect, test } from '@playwright/test'
import {
  abrir,
  botonCancelar,
  comoUsuarioConocido,
  elegirDestino,
  elegirOrigen,
  elegirRecorrido,
} from './ayudas.ts'

// Recorridos sin gestos: corren en `movil` (Chromium) y en `webkit`. La app abre directo en
// "Cómo llegar" (origen y destino a la vista) y en celular no hay hoja inferior.

const BIBLIOTECA = 'Punto de partida: Biblioteca Leopoldo Marechal. Cambiar'

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

test('abre en "Cómo llegar" con origen y destino vacíos y sin hoja inferior', async ({ page }) => {
  await abrir(page)
  await expect(
    page.getByRole('button', { name: 'Punto de partida: ¿Desde dónde salís?' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: ¿A dónde vas?' })).toBeVisible()
  await expect(page.locator('.hoja')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Cambiar altura del panel' })).toHaveCount(0)
  expect(new URL(page.url()).hash).toBe('')
})

test('destino "121" y origen Biblioteca piden la ruta; "Cancelar" vuelve al panel vacío', async ({
  page,
}) => {
  await abrir(page)
  await elegirDestino(page, '121', /^Aula 121/)
  await expect(page.getByRole('button', { name: 'Destino: Aula 121. Cambiar' })).toBeVisible()
  await page.getByRole('button', { name: /^Punto de partida/ }).tap()
  await expect(page.getByRole('dialog', { name: 'Elegir punto de partida' })).toBeVisible()
  await page.getByRole('option', { name: /^Biblioteca/ }).tap()

  // Se pidió la ruta: el resultado está montado (oculto en celular) y se dibuja en el mapa.
  await expect(page.getByRole('button', { name: BIBLIOTECA })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: Aula 121. Cambiar' })).toBeVisible()
  await expect(page.getByTestId('contenido-ruta')).toBeAttached()
  await expect(page.locator('.mapa')).toHaveAttribute('data-ruta-nodos', /puerta-/)

  await botonCancelar(page).tap()
  await expect(
    page.getByRole('button', { name: 'Punto de partida: ¿Desde dónde salís?' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: ¿A dónde vas?' })).toBeVisible()
  await expect(page.locator('.mapa')).not.toHaveAttribute('data-ruta-nodos', /.+/)
  await expect(botonCancelar(page)).toHaveCount(0)
})

test('elegir primero el origen pasa solo a buscar el destino', async ({ page }) => {
  await abrir(page)
  await page.getByRole('button', { name: /^Punto de partida/ }).tap()
  await expect(page.getByRole('dialog', { name: 'Elegir punto de partida' })).toBeVisible()
  await page.getByRole('combobox').fill('biblio')
  await page.getByRole('option', { name: /^Biblioteca/ }).tap()
  await expect(page.getByRole('dialog', { name: 'Buscar lugar' })).toBeVisible()
  await expect(page.getByRole('combobox')).toBeFocused()
  await page.getByRole('combobox').fill('121')
  await page.getByRole('option', { name: /^Aula 121/ }).tap()
  await expect(page.getByRole('button', { name: BIBLIOTECA })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: Aula 121. Cambiar' })).toBeVisible()
  await expect(page.locator('.mapa')).toHaveAttribute('data-ruta-nodos', /puerta-/)
  expect(new URL(page.url()).hash).toBe('')
})

test('Atrás con la búsqueda abierta vuelve al panel con el mapa', async ({ page }) => {
  await abrir(page)
  await page.getByRole('button', { name: /^Destino:/ }).tap()
  await expect(page.getByRole('dialog', { name: 'Buscar lugar' })).toBeVisible()
  await page.goBack()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'Mapa del campus' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Destino:/ })).toBeVisible()
})

test('un enlace viejo a una ficha (#lugar/puerta-aula-121) o un hash desconocido abren el panel', async ({
  page,
}) => {
  for (const hash of ['#lugar/puerta-aula-121', '#cualquier-cosa']) {
    await abrir(page, `/${hash}`)
    await expect(page.getByRole('button', { name: 'Destino: ¿A dónde vas?' })).toBeVisible()
    await expect(page.getByRole('heading', { level: 2, name: 'Aula 121' })).toHaveCount(0)
  }
})

test('elegir un lugar en un campo del panel actualiza solo ese campo', async ({ page }) => {
  await abrir(page)
  await elegirRecorrido(page, ['biblio', /^Biblioteca/], ['florencio', /^Entrada Florencio Varela/])
  const origen = page.getByRole('button', {
    name: 'Punto de partida: Entrada Florencio Varela. Cambiar',
  })
  await expect(origen).toBeVisible()

  await elegirDestino(page, '302', /^Aula 302/)
  await expect(page.getByRole('button', { name: 'Destino: Aula 302. Cambiar' })).toBeVisible()
  await expect(origen).toBeVisible()

  await elegirOrigen(page, 'teatro', /^Teatro/)
  await expect(
    page.getByRole('button', { name: 'Punto de partida: Teatro. Cambiar' }),
  ).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: Aula 302. Cambiar' })).toBeVisible()
})

test('la cruz de un reciente lo quita de la búsqueda', async ({ page }) => {
  await abrir(page)
  await page.getByRole('button', { name: /^Destino:/ }).tap()
  const recientes = page.getByRole('group', { name: 'Recientes' })
  await expect(recientes.getByRole('option', { name: /^Teatro/ })).toBeVisible()
  await page.getByTitle('Quitar Teatro de recientes').tap()
  await expect(recientes).toHaveCount(0)
  await expect(page.getByRole('dialog', { name: 'Buscar lugar' })).toBeVisible()
})

test('la ayuda se abre desde el panel vacío y con ruta; Atrás la cierra sin cambiar la selección', async ({
  page,
}) => {
  await abrir(page)
  const ayuda = page.getByRole('dialog', { name: 'Cómo usar ¿Dónde queda?' })

  await page.getByRole('button', { name: 'Ayuda', exact: true }).tap()
  await expect(ayuda).toBeVisible()
  await expect(ayuda.getByText('La app no usa tu ubicación', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar la ayuda' }).tap()
  await expect(ayuda).toHaveCount(0)

  await elegirRecorrido(page, ['teatro', /^Teatro/], ['biblio', /^Biblioteca/])
  await page.getByRole('button', { name: 'Ayuda', exact: true }).tap()
  await expect(ayuda).toBeVisible()
  await expect(page).toHaveURL(/#ayuda$/)
  await page.goBack()
  await expect(ayuda).toHaveCount(0)
  await expect(page.getByRole('button', { name: BIBLIOTECA })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Destino: Teatro. Cambiar' })).toBeVisible()
})

test('el foco con Tab nunca cae en contenido oculto ni fuera de la pantalla', async ({ page }) => {
  await abrir(page)
  await elegirRecorrido(page, ['teatro', /^Teatro/], ['biblio', /^Biblioteca/])
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab')
    await page.waitForTimeout(100)
    const r = await page.evaluate(() => {
      const el = document.activeElement
      if (!el || el === document.body) return null
      const c = el.getBoundingClientRect()
      return {
        arriba: c.top,
        alto: window.innerHeight,
        oculto: !!el.closest('[hidden], [inert]'),
      }
    })
    if (!r) continue
    expect(r.oculto).toBe(false)
    expect(r.arriba).toBeLessThan(r.alto)
  }
})
