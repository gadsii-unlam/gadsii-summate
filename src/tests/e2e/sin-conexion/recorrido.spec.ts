import { expect, test, type BrowserContext } from '@playwright/test'
import { abrir, comoUsuarioConocido, esperarMapaQuieto } from '../ayudas.ts'
import {
  barraSinConexion,
  contenidoCaches,
  esperarServiceWorker,
  mapa,
  nodosRuta,
  pedirRuta,
  respuestasDurante,
} from './ayudas-sw.ts'

// Recorridos sin conexión (tolerar-senal-irregular, tareas 2.2, 4.2 a 4.5, 5.3, 5.5 y 8.1):
// Dirección de Alumnos → Dpto. de Cs. de la Salud.

test.use({ serviceWorkers: 'allow', timezoneId: 'America/Argentina/Buenos_Aires' })

const PREGUNTA = 'No pudimos consultar el clima. ¿Cómo querés ir?'
const destinoSalud = /^Destino: Dpto\. de Cs\. de la Salud/
const origenAlumnos = /^Punto de partida: Dirección de Alumnos/
const chip = (page: import('@playwright/test').Page, nombre: RegExp) =>
  page.getByRole('list', { name: 'Opciones de ruta' }).getByRole('button', { name: nombre })

/** Sirve `/data/cierres.json` con estos cierres (también para el service worker). */
async function servirCierres(context: BrowserContext, cierres: unknown[]) {
  await context.unroute('**/data/cierres.json')
  await context.route('**/data/cierres.json', (r) =>
    r.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({ version: 1, actualizado: '2026-10-22T09:00:00-03:00', cierres }),
    }),
  )
}

/** Un nodo intermedio de la ruta (ni la primera ni la última puerta) para cerrarlo. */
function nodoIntermedio(nodos: string[]): string {
  const candidatos = nodos.slice(2, -2).filter((n) => !n.startsWith('puerta-'))
  const n = candidatos[Math.floor(candidatos.length / 2)]
  if (!n) throw new Error('ruta muy corta')
  return n
}

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

test('ruta nueva sin señal: avisa el clima, deja elegir el criterio y muestra "Sin conexión"', async ({
  page,
  context,
}) => {
  await abrir(page, '/?clima=lluvia')
  await esperarServiceWorker(page)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()

  await pedirRuta(page)
  await expect(page.getByText(PREGUNTA)).toBeVisible()
  await expect(barraSinConexion(page)).toContainText('Sin conexión')
  await page
    .getByRole('group', { name: '¿Cómo querés ir?' })
    .getByRole('button', { name: /^Más resguardada/ })
    .tap()
  const nodos = await nodosRuta(page)
  expect(nodos[0]).toMatch(/^puerta-direccion-alumnos/)
  expect(nodos.at(-1)).toMatch(/^puerta-dpto-cs-salud/)
  await expect(page.getByRole('button', { name: destinoSalud })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Reintentar' }).first()).toBeVisible()
})

test('lluvia consultada antes del corte: sin red no se usa y el clima queda desconocido', async ({
  page,
  context,
}) => {
  await abrir(page, '/?clima=lluvia')
  await esperarServiceWorker(page)
  await pedirRuta(page)
  await expect(page.getByText('Llueve · te recomendamos la ruta más resguardada')).toBeVisible()
  await page.getByRole('button', { name: 'Iniciar', exact: true }).tap()
  await page.getByRole('button', { name: 'Finalizar viaje' }).tap()

  await context.setOffline(true)
  await pedirRuta(page)
  await expect(page.getByText(PREGUNTA)).toBeVisible()
  await expect(page.getByText('Llueve · te recomendamos la ruta más resguardada')).toHaveCount(0)
})

test('cierre guardado respetado sin conexión, con "Cierres sin actualizar desde las HH:MM"', async ({
  page,
  context,
}) => {
  await servirCierres(context, [
    {
      id: 'obra-kinesiologia',
      motivo: 'Obra en la entrada del hall de Kinesiología',
      nodos: ['entrada-ed-este-kinesiologia'],
    },
  ])
  await abrir(page, '/?clima=seco')
  await esperarServiceWorker(page)
  // La primera carga (antes del control del service worker) no queda guardada: se recarga una vez.
  await page.reload()
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
  await expect
    .poll(async () => (await contenidoCaches(page)).cierres ?? [])
    .toContain('/data/cierres.json')

  // Sin red (y sin el archivo de prueba): la ruta usa la copia guardada por el service worker.
  await context.unroute('**/data/cierres.json')
  await context.setOffline(true)
  await page.reload()
  await pedirRuta(page)
  // La más corta entraba por el hall de Kinesiología: con esa entrada cerrada, la evita.
  const nodos = await nodosRuta(page)
  expect(nodos).not.toContain('entrada-ed-este-kinesiologia')
  await expect(barraSinConexion(page)).toContainText(/Cierres sin actualizar desde las \d\d:\d\d/)
})

test('corte con la ruta en pantalla: "Reintentar" sin red no borra nada y al volver la red el aviso se va', async ({
  page,
  context,
}) => {
  await abrir(page, '/?clima=seco')
  await esperarServiceWorker(page)
  await pedirRuta(page)
  const antes = await nodosRuta(page)

  await context.setOffline(true)
  await expect(barraSinConexion(page)).toContainText('Sin conexión')
  // A 390 × 844 la barra va arriba de la hoja: no tapa el panel "Cómo llegar" ni la tarjeta
  // resumen de la ruta.
  const barra = (await page.locator('.aviso-conexion').boundingBox())!
  const panel = (await page.locator('.tarjeta-superior').boundingBox())!
  const resumen = (await page.getByTestId('ruta-resumen').boundingBox())!
  const hoja = (await page.locator('.hoja').boundingBox())!
  expect(barra.y).toBeGreaterThanOrEqual(panel.y + panel.height)
  expect(barra.y + barra.height).toBeLessThanOrEqual(hoja.y)
  expect(barra.y + barra.height).toBeLessThanOrEqual(resumen.y)
  const reintentar = page.locator('.aviso-conexion').getByRole('button', { name: /Reintentar/ })
  await reintentar.tap()
  await expect(reintentar).toBeEnabled()
  expect(await nodosRuta(page)).toEqual(antes)
  await expect(page.getByRole('button', { name: destinoSalud })).toBeVisible()
  await expect(page.getByRole('button', { name: origenAlumnos })).toBeVisible()
  await expect(barraSinConexion(page)).toBeVisible()

  await context.setOffline(false)
  await expect(page.locator('.aviso-conexion')).toHaveCount(0)
  expect(await nodosRuta(page)).toEqual(antes)
})

test('"Reintentar" con un cierre nuevo en la ruta: la ruta lo evita y lo avisa', async ({
  page,
  context,
}) => {
  await servirCierres(context, [])
  await abrir(page, '/?clima=seco')
  await esperarServiceWorker(page)
  await pedirRuta(page)
  const antes = await nodosRuta(page)
  const cerrado = nodoIntermedio(antes)

  // La red "se cae" sin evento offline (Wi-Fi sin salida): fallan cierres y clima.
  await context.route('**/api/clima/**', (r) => r.abort('internetdisconnected'))
  await context.unroute('**/data/cierres.json')
  await context.route('**/data/cierres.json', (r) => r.abort('internetdisconnected'))
  await page.locator('.aviso-clima, [data-testid="contenido-ruta"]').first().waitFor()
  // Pedir de nuevo el clima con la red caída: la barra aparece.
  await page.evaluate(() => window.dispatchEvent(new Event('offline')))
  await expect(barraSinConexion(page)).toContainText('Sin conexión')

  // Vuelve la red con un cierre nuevo en un tramo de la ruta mostrada.
  await context.unroute('**/api/clima/**')
  await servirCierres(context, [{ id: 'nuevo', motivo: 'Cierre nuevo', nodos: [cerrado] }])
  await page
    .locator('.aviso-conexion')
    .getByRole('button', { name: /Reintentar/ })
    .tap()
  await expect(page.getByText('Actualizamos la ruta con los datos nuevos')).toBeVisible()
  await expect.poll(async () => (await nodosRuta(page)).includes(cerrado)).toBe(false)
  await expect(page.locator('.aviso-conexion')).toHaveCount(0)
  await expect(page.getByRole('button', { name: destinoSalud })).toBeVisible()
})

test('al volver la red sola con un tramo cerrado, la ruta no cambia hasta "Ver ruta actualizada"', async ({
  page,
  context,
}) => {
  await servirCierres(context, [])
  await abrir(page, '/?clima=seco')
  await esperarServiceWorker(page)
  await pedirRuta(page)
  const antes = await nodosRuta(page)
  const cerrado = nodoIntermedio(antes)

  await context.setOffline(true)
  await expect(barraSinConexion(page)).toContainText('Sin conexión')
  await servirCierres(context, [{ id: 'nuevo', motivo: 'Cierre nuevo', nodos: [cerrado] }])
  await context.setOffline(false)

  await expect(page.getByText('Un tramo de tu ruta está cerrado')).toBeVisible()
  expect(await nodosRuta(page)).toEqual(antes)
  await page.getByRole('button', { name: 'Ver ruta actualizada' }).tap()
  await expect(page.getByText('Actualizamos la ruta con los datos nuevos')).toBeVisible()
  await expect.poll(async () => (await nodosRuta(page)).includes(cerrado)).toBe(false)
})

test('recargar sin conexión restaura la misma ruta "Más resguardada"; a las 3 horas, no', async ({
  page,
  context,
}) => {
  await page.clock.install({ time: new Date('2026-10-22T13:40:00-03:00') })
  await abrir(page, '/?clima=lluvia')
  await esperarServiceWorker(page)
  await pedirRuta(page)
  await expect(chip(page, /^Más resguardada/)).toHaveAttribute('aria-pressed', 'true')
  const antes = await nodosRuta(page)

  await context.setOffline(true)
  const respuestas = await respuestasDurante(
    page,
    (u) => u.pathname.startsWith('/data/') || u.pathname === '/',
    async () => {
      await page.reload()
      expect(await nodosRuta(page)).toEqual(antes)
    },
  )
  for (const r of respuestas) expect(r.fromServiceWorker(), r.url()).toBe(true)
  await expect(chip(page, /^Más resguardada/)).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('button', { name: destinoSalud })).toBeVisible()
  await expect(page.getByRole('button', { name: origenAlumnos })).toBeVisible()
  await expect(page.getByText(PREGUNTA)).toHaveCount(0)
  await expect(barraSinConexion(page)).toContainText('Sin conexión')

  await page.clock.fastForward('03:00:00')
  await page.goto('/')
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
  await expect(mapa(page)).not.toHaveAttribute('data-ruta-nodos', /puerta-/)
  await expect(page.getByTestId('contenido-ruta')).toHaveCount(0)
})

test('"Finalizar viaje" y recargar: abre sin ruta', async ({ page }) => {
  await abrir(page, '/?clima=seco')
  await esperarServiceWorker(page)
  await pedirRuta(page)
  await nodosRuta(page)
  await page.getByRole('button', { name: 'Iniciar', exact: true }).tap()
  await page.getByRole('button', { name: 'Finalizar viaje' }).tap()
  await page.reload()
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
  await expect(page.getByTestId('contenido-ruta')).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('dq:recorrido:v1'))).toBeNull()
})

test('con el almacenamiento bloqueado la app calcula y muestra la ruta sin errores', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const lanzar = () => {
      throw new DOMException('bloqueado', 'SecurityError')
    }
    Storage.prototype.getItem = lanzar
    Storage.prototype.setItem = lanzar
    Storage.prototype.removeItem = lanzar
  })
  const errores: string[] = []
  page.on('pageerror', (e) => errores.push(e.message))
  await page.goto('/?clima=seco')
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
  await esperarMapaQuieto(page)
  await pedirRuta(page)
  await nodosRuta(page)
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.locator('.aviso-conexion')).toHaveCount(0)
  expect(errores).toEqual([])
})
