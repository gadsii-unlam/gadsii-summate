import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { comoUsuarioConocido } from '../ayudas.ts'
import { barraSinConexion, esperarServiceWorker, nodosRuta, pedirRuta } from './ayudas-sw.ts'
import {
  RAIZ,
  buildBase,
  compilarAutodestruccion,
  copiarComoVersionNueva,
  iniciarServidor,
  type Servidor,
} from './servidor.ts'

// Corte real del servidor (8.2) y versión nueva en el mismo puerto (6.1, 6.2 y caso 7 de la
// decisión 10). Cada test levanta su propio `vite preview` en un puerto aparte.

test.use({ serviceWorkers: 'allow' })
test.describe.configure({ mode: 'serial' })

let servidor: Servidor | null = null

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

test.afterEach(async () => {
  await servidor?.detener()
  servidor = null
})

test('corte real: con el servidor detenido la ruta, el origen y el destino siguen y aparece "Sin conexión"', async ({
  page,
}) => {
  servidor = await iniciarServidor(buildBase(), 4191)
  await page.goto(`${servidor.url}/?clima=seco`)
  await esperarServiceWorker(page)
  await pedirRuta(page)
  const antes = await nodosRuta(page)

  await servidor.detener()
  servidor = null
  // Sin evento offline (el dispositivo cree que tiene red): la próxima consulta falla de verdad.
  await page.reload()
  expect(await nodosRuta(page)).toEqual(antes)
  await expect(
    page.getByRole('button', { name: /^Destino: Dpto\. de Cs\. de la Salud/ }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: /^Punto de partida: Dirección de Alumnos/ }),
  ).toBeVisible()
  await expect(barraSinConexion(page)).toContainText('Sin conexión')
  expect(await page.evaluate(() => navigator.onLine)).toBe(true)

  // "Reintentar" con el servidor caído: todo sigue igual.
  await page
    .locator('.aviso-conexion')
    .getByRole('button', { name: /Reintentar/ })
    .tap()
  await expect(
    page.locator('.aviso-conexion').getByRole('button', { name: 'Reintentar' }),
  ).toBeEnabled()
  expect(await nodosRuta(page)).toEqual(antes)
})

async function hayEnEspera(page: import('@playwright/test').Page) {
  return page.evaluate(async () => !!(await navigator.serviceWorker.getRegistration())?.waiting)
}

test('versión nueva con una ruta en pantalla: no aparece ni recarga; después de "Finalizar viaje", sí', async ({
  page,
}) => {
  const base = buildBase()
  const nueva = copiarComoVersionNueva(base, join(RAIZ, 'node_modules/.cache/dist-version-nueva'))
  servidor = await iniciarServidor(base, 4192)
  await page.goto(`${servidor.url}/?clima=seco`)
  await esperarServiceWorker(page)
  await pedirRuta(page)
  const antes = await nodosRuta(page)

  // Se publica otra versión en el mismo puerto; al abrir (recargar) se busca y queda en espera.
  await servidor.detener()
  servidor = await iniciarServidor(nueva, 4192)
  await page.reload()
  expect(await nodosRuta(page)).toEqual(antes)
  await expect.poll(() => hayEnEspera(page)).toBe(true)
  await page.waitForTimeout(500)
  await expect(page.getByText('Hay una versión nueva')).toHaveCount(0)
  expect(await nodosRuta(page)).toEqual(antes)

  await page.getByRole('button', { name: 'Iniciar', exact: true }).tap()

  await page.getByRole('button', { name: 'Finalizar viaje' }).tap()
  await expect(page.getByText('Hay una versión nueva')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Actualizar' })).toBeVisible()
})

test('"Actualizar" con un destino elegido y sin ruta: recarga con la versión nueva y el destino sigue', async ({
  page,
}) => {
  const base = buildBase()
  const nueva = copiarComoVersionNueva(base, join(RAIZ, 'node_modules/.cache/dist-version-nueva'))
  servidor = await iniciarServidor(base, 4193)
  await page.goto(`${servidor.url}/?clima=seco`)
  await esperarServiceWorker(page)
  const destino = page.getByRole('button', { name: /^Destino: Dpto\. de Cs\. de la Salud/ })
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await page.getByRole('combobox').fill('Salud')
  await page
    .getByRole('option', { name: /^Dpto\. de Cs\. de la Salud/ })
    .first()
    .tap()
  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await expect(destino).toBeVisible()
  await expect(page.getByTestId('contenido-ruta')).toHaveCount(0)

  await servidor.detener()
  servidor = await iniciarServidor(nueva, 4193)
  await page.reload()
  await expect(destino).toBeVisible()
  await expect(page.getByText('Hay una versión nueva')).toBeVisible()
  const activoAntes = await page.evaluate(
    async () => (await navigator.serviceWorker.getRegistration())?.active?.scriptURL,
  )
  expect(activoAntes).toContain('/sw.js')

  await Promise.all([
    page.waitForEvent('load'),
    page.getByRole('button', { name: 'Actualizar' }).tap(),
  ])
  await expect(destino).toBeVisible()
  await expect(page.getByText('Hay una versión nueva')).toHaveCount(0)
  expect(await hayEnEspera(page)).toBe(false)
})

test('plan de salida: el build con selfDestroying desregistra el service worker y borra las cachés', async ({
  page,
}) => {
  test.setTimeout(90_000)
  const salida = compilarAutodestruccion(join(RAIZ, 'node_modules/.cache/dist-autodestruir'))
  servidor = await iniciarServidor(buildBase(), 4194)
  await page.goto(`${servidor.url}/`)
  await esperarServiceWorker(page)
  expect((await page.evaluate(() => caches.keys())).length).toBeGreaterThan(0)

  await servidor.detener()
  servidor = await iniciarServidor(salida, 4194)
  await page.reload()
  await expect
    .poll(
      () =>
        page.evaluate(async () => ({
          registros: (await navigator.serviceWorker.getRegistrations()).length,
          caches: (await caches.keys()).length,
        })),
      { timeout: 20_000 },
    )
    .toEqual({ registros: 0, caches: 0 })
  // La app sigue funcionando con red.
  await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
})
