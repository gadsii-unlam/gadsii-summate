import { expect, test } from '@playwright/test'
import { abrir, comoUsuarioConocido, esperarPlano } from '../ayudas.ts'
import { esperarServiceWorker, respuestasDurante } from './ayudas-sw.ts'

// El service worker es el objeto de estas pruebas (el resto de la suite lo bloquea).
test.use({ serviceWorkers: 'allow' })

// Tareas 1.1, 1.2, 7.1 y 8.1 (arranque sin red) de tolerar-senal-irregular.

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

test('después de la primera visita abre sin conexión y el mapa sale del service worker', async ({
  page,
  context,
}) => {
  await abrir(page)
  await esperarServiceWorker(page)

  await context.setOffline(true)
  const respuestas = await respuestasDurante(
    page,
    (u) =>
      u.pathname === '/' || u.pathname.startsWith('/data/') || u.pathname.startsWith('/assets/'),
    async () => {
      await page.reload()
      await expect(page.getByRole('button', { name: /^¿Desde dónde salís\?/ })).toBeVisible()
      await esperarPlano(page)
    },
  )

  const caminos = respuestas.map((r) => new URL(r.url()).pathname)
  for (const dato of ['/data/grafo.json', '/data/lugares.json', '/data/plano.json']) {
    expect(caminos, dato).toContain(dato)
  }
  expect(caminos).toContain('/data/mapa-base.svg')
  for (const r of respuestas) {
    expect(r.fromServiceWorker(), r.url()).toBe(true)
    expect(r.status(), r.url()).toBe(200)
  }
  await expect(page.getByRole('region', { name: 'Mapa del campus' })).toBeVisible()
})

test('sin conexión, la búsqueda encuentra Dir. de Alumnos', async ({ page, context }) => {
  await abrir(page)
  await esperarServiceWorker(page)
  await context.setOffline(true)
  await page.reload()

  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await page.getByRole('combobox').fill('dir de alumnos')
  await expect(
    page.getByRole('option', { name: /^Dirección de Alumnos Ciencias Económicas/ }).first(),
  ).toBeVisible()
})

test('una ruta cualquiera de la SPA abre sin conexión (NavigationRoute)', async ({
  page,
  context,
}) => {
  await abrir(page)
  await esperarServiceWorker(page)
  await context.setOffline(true)
  await page.goto('/?clima=lluvia#lugar/puerta-aula-121')
  await expect(page.getByRole('heading', { level: 2, name: 'Aula 121' })).toBeVisible()
})

test('la app es instalable según Chrome (manifiesto, íconos y service worker)', async ({
  page,
}) => {
  await abrir(page)
  await esperarServiceWorker(page)
  const cdp = await page.context().newCDPSession(page)
  const { installabilityErrors } = (await cdp.send('Page.getInstallabilityErrors')) as {
    installabilityErrors: { errorId: string }[]
  }
  expect(installabilityErrors).toEqual([])
  const manifiesto = (await cdp.send('Page.getAppManifest')) as { errors: unknown[]; url: string }
  expect(manifiesto.url).toMatch(/\/manifest\.webmanifest$/)
  expect(manifiesto.errors).toEqual([])
  await cdp.detach()
})
