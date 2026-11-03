import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'
import { abrir, comoUsuarioConocido } from './ayudas.ts'

// Cierres temporales (aplicar-cierres-temporales). Se sirve un archivo de cierres de prueba en
// lugar de /data/cierres.json. El aviso de desvío y "Sin ruta disponible" los muestra la hoja de
// `mostrar-ruta-e-indicaciones`.

test.use({ timezoneId: 'America/Argentina/Buenos_Aires' })

const OBRA = 'Obra en la entrada oeste del Edificio Sur'
const ESCALERA = 'Escalera junto a la Radio cerrada por mantenimiento'

const CIERRES_DE_PRUEBA = {
  version: 1,
  cierres: [
    {
      id: 'obra-entrada-edificio-sur',
      motivo: OBRA,
      nodos: ['entrada-ed-sur-oeste-sur'],
      desde: '2026-11-03T07:00:00-03:00',
      hasta: '2026-11-14T23:00:00-03:00',
    },
    // La escalera es el único acceso al 1er piso.
    { id: 'escalera-radio', motivo: ESCALERA, nodos: ['escalera-radio-primer-piso'] },
  ],
}

async function servirCierres(page: Page, cuerpo: unknown = CIERRES_DE_PRUEBA) {
  await page.route('**/data/cierres.json', (ruta) =>
    ruta.fulfill({ contentType: 'application/json', body: JSON.stringify(cuerpo) }),
  )
}

const icono = (page: Page, motivo: string) => page.getByTitle(`Tramo cerrado: ${motivo}`)

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

test('con la fecha simulada se ve la etiqueta y los tramos cerrados vigentes en el mapa', async ({
  page,
}) => {
  await servirCierres(page)
  await abrir(page, '/?ahora=2026-11-05T10:00-03:00')
  await expect(page.getByText('Fecha simulada: 05/11 10:00')).toBeVisible()

  const obra = icono(page, OBRA)
  await expect(obra).toHaveCount(1)
  await expect(icono(page, ESCALERA)).toHaveCount(1)
  // Íconos de al menos 44 px táctiles en el pane de cierres (debajo de la ruta).
  const caja = await obra.boundingBox()
  expect(caja?.width).toBeGreaterThanOrEqual(44)
  expect(caja?.height).toBeGreaterThanOrEqual(44)
  await expect(page.locator('.leaflet-cierres-pane .cierre__icono')).toHaveCount(2)
  // Línea roja punteada sobre las aristas de los nodos cerrados.
  const lineas = page.locator(
    '.leaflet-cierres-pane path[stroke="#D93025"][stroke-dasharray="6 6"]',
  )
  expect(await lineas.count()).toBeGreaterThan(0)

  // Tocar el ícono muestra el motivo y hasta cuándo.
  await obra.dispatchEvent('click')
  const burbuja = page.locator('.leaflet-popup')
  await expect(burbuja).toContainText(OBRA)
  await expect(burbuja).toContainText('Cerrado hasta el 14/11 a las 23:00')
})

test('un cierre que todavía no empezó no se dibuja', async ({ page }) => {
  await servirCierres(page)
  await abrir(page, '/?ahora=2026-11-02T18:00-03:00')
  await expect(page.getByText('Fecha simulada: 02/11 18:00')).toBeVisible()
  await expect(icono(page, ESCALERA)).toHaveCount(1)
  await expect(icono(page, OBRA)).toHaveCount(0)
})

test('Laboratorio de Química (1er piso) aparece como "Sin acceso ahora" en la búsqueda y en su ficha', async ({
  page,
}) => {
  await servirCierres(page)
  await abrir(page)
  await expect(page.getByText(/^Fecha simulada/)).toHaveCount(0)
  await expect(icono(page, ESCALERA)).toHaveCount(1) // los cierres ya cargaron

  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await page.getByRole('combobox').fill('Laboratorio')
  const opcion = page.getByRole('option', { name: /^Laboratorio de Química/ })
  await expect(opcion).toContainText('Sin acceso ahora')
  // Uno de planta baja sigue con acceso.
  await expect(page.getByRole('option', { name: /^Laboratorio Kinesiología/ })).not.toContainText(
    'Sin acceso ahora',
  )
  await opcion.tap()
  await expect(
    page.getByRole('heading', { level: 2, name: 'Laboratorio de Química' }),
  ).toBeVisible()
  await expect(page.locator('.estado-acceso')).toContainText('Sin acceso ahora')

  // Pedir la ruta lleva a "Sin ruta disponible" con el motivo.
  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await page.getByRole('button', { name: /^Punto de partida/ }).tap()
  await page.getByRole('combobox').fill('121')
  await page.getByRole('option', { name: /^Aula 121/ }).tap()
  const sinRuta = page.getByTestId('ruta-sin-ruta')
  await expect(sinRuta).toContainText('Sin ruta disponible')
  await expect(sinRuta).toContainText(
    `Los accesos a Laboratorio de Química están cerrados: ${ESCALERA}.`,
  )
  await expect(sinRuta.getByRole('button', { name: 'Elegir otro destino' })).toBeVisible()
  await sinRuta.getByRole('button', { name: 'Volver al mapa' }).tap()
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
})

test('Enfermería → Aula 101 con la obra vigente muestra el aviso de desvío', async ({ page }) => {
  await servirCierres(page)
  await abrir(page, '/?ahora=2026-11-05T10:00-03:00&clima=seco')
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await page.getByRole('combobox').fill('101')
  await page.getByRole('option', { name: /^Aula 101/ }).tap()
  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await page.getByRole('button', { name: /^Punto de partida/ }).tap()
  await page.getByRole('combobox').fill('Enfermería')
  await page.getByRole('option', { name: /^Enfermería/ }).tap()
  await expect(page.getByTestId('ruta-desvio')).toHaveText(`Evitamos un tramo cerrado: ${OBRA}`)
  await expect(icono(page, OBRA)).toHaveCount(1)
  const nodos = await page.locator('.mapa').getAttribute('data-ruta-nodos')
  expect(nodos?.split(' ')).not.toContain('entrada-ed-sur-oeste-sur')
})

test('sin cierres publicados (lista vacía) no hay tramos cerrados ni lugares sin acceso', async ({
  page,
}) => {
  await servirCierres(page, { version: 1, cierres: [] })
  await abrir(page)
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await page.getByRole('combobox').fill('Química')
  await expect(page.getByRole('option', { name: /^Laboratorio de Química/ })).toBeVisible()
  await expect(page.getByRole('option', { name: /^Laboratorio de Química/ })).not.toContainText(
    'Sin acceso ahora',
  )
  await expect(page.locator('.cierre__icono')).toHaveCount(0)
})

test('si falla la descarga se usa la copia incluida y la app sigue funcionando', async ({
  page,
}) => {
  const avisos: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'warning') avisos.push(m.text())
  })
  await page.route('**/data/cierres.json', (ruta) => ruta.abort('internetdisconnected'))
  await abrir(page)
  await expect
    .poll(() => avisos.some((a) => a.includes('[cierres] no se pudo descargar')))
    .toBe(true)
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await expect(page.getByRole('combobox')).toBeFocused()
})

test('la leyenda de la ayuda explica el símbolo de tramo cerrado', async ({ page }) => {
  await servirCierres(page)
  await abrir(page)
  await page.getByRole('button', { name: 'Ayuda' }).tap()
  await expect(page.getByRole('dialog')).toContainText(
    'Tramo cerrado: tocá el ícono para ver el motivo',
  )
})
