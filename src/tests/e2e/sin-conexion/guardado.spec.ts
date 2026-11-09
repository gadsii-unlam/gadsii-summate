import { expect, test, type Page } from '@playwright/test'
import { abrir, comoUsuarioConocido } from '../ayudas.ts'
import { nodosRuta } from './ayudas-sw.ts'

// Recorrido guardado en `localStorage` (tolerar-senal-irregular, 5.2) e instalación en la ayuda
// (7.2). No dependen del service worker.

test.use({ serviceWorkers: 'block' })

async function guardado(page: Page) {
  return page.evaluate(() => {
    const t = localStorage.getItem('dq:recorrido:v1')
    return t ? (JSON.parse(t) as Record<string, unknown>) : null
  })
}

const chip = (page: Page, nombre: RegExp) =>
  page.getByRole('list', { name: 'Opciones de ruta' }).getByRole('button', { name: nombre })

test.beforeEach(async ({ page }) => {
  await comoUsuarioConocido(page)
})

test('cada paso del recorrido deja en localStorage lo esperado, y "Finalizar viaje" lo borra', async ({
  page,
}) => {
  await abrir(page, '/?clima=lluvia')
  expect(await guardado(page)).toBeNull()

  // Elegir el destino (sin ruta todavía).
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await page.getByRole('combobox').fill('Salud')
  await page
    .getByRole('option', { name: /^Dpto\. de Cs\. de la Salud/ })
    .first()
    .tap()
  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await expect
    .poll(() => guardado(page))
    .toMatchObject({
      esquema: 1,
      destino: 'dpto-cs-salud',
      rutas: [],
    })
  expect((await guardado(page))?.origen).toBeUndefined()

  // Confirmar el origen: se muestra la ruta "Más resguardada" (llueve).
  await page.getByRole('button', { name: /^Punto de partida/ }).tap()
  await page.getByRole('combobox').fill('Alumnos')
  await page
    .getByRole('option', { name: /^Dirección de Alumnos/ })
    .first()
    .tap()
  const nodos = await nodosRuta(page)
  await expect
    .poll(() => guardado(page))
    .toMatchObject({
      origen: 'direccion-alumnos',
      destino: 'dpto-cs-salud',
      alternativaMostrada: 'resguardada',
      climaUsado: 'lluvia',
    })
  const conRuta = await guardado(page)
  const rutas = conRuta?.rutas as { criterio: string; nodos: string[] }[]
  expect(rutas[0]).toEqual({ criterio: 'resguardada', nodos })
  expect(rutas).toHaveLength(2)
  expect(typeof conRuta?.versionDatos).toBe('string')
  expect(Date.parse(String(conRuta?.guardadoEn))).not.toBeNaN()

  // Cambiar de alternativa.
  await chip(page, /^Más rápida/).tap()
  await expect.poll(async () => (await guardado(page))?.alternativaMostrada).toBe('mas-corta')

  // "Finalizar viaje" lo borra.
  await page.getByRole('button', { name: 'Iniciar', exact: true }).tap()
  await page.getByRole('button', { name: 'Finalizar viaje' }).tap()
  await expect.poll(() => guardado(page)).toBeNull()
})

test('la ayuda ofrece "Instalar en el celular" cuando Chrome lo permite y abre el diálogo del sistema', async ({
  page,
}) => {
  await abrir(page)
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt', { cancelable: true }) as Event & {
      prompt: () => Promise<void>
      userChoice: Promise<{ outcome: string }>
    }
    e.prompt = () => {
      ;(window as unknown as { pedidoInstalar: boolean }).pedidoInstalar = true
      return Promise.resolve()
    }
    e.userChoice = Promise.resolve({ outcome: 'dismissed' })
    window.dispatchEvent(e)
  })
  // En el primer uso o sin abrir la ayuda no hay sugerencia.
  await expect(page.getByRole('button', { name: 'Instalar en el celular' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Ayuda' }).tap()
  await page.getByRole('button', { name: 'Instalar en el celular' }).tap()
  expect(
    await page.evaluate(() => (window as unknown as { pedidoInstalar?: boolean }).pedidoInstalar),
  ).toBe(true)
})
