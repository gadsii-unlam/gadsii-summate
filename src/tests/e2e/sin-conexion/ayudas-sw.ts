/** Ayudas de los tests sin conexión: esperar el service worker y mirar sus cachés. */
import { expect, type Page, type Response } from '@playwright/test'

/**
 * Espera a que el service worker esté activo (precache completo) y controle la página. Con
 * `clientsClaim` la primera visita queda controlada sin recargar.
 */
export async function esperarServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
    if (navigator.serviceWorker.controller) return
    await new Promise<void>((listo) =>
      navigator.serviceWorker.addEventListener('controllerchange', () => listo(), { once: true }),
    )
  })
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true)
}

/** Nombres de las cachés y URLs (camino) de cada una. */
export async function contenidoCaches(page: Page): Promise<Record<string, string[]>> {
  return page.evaluate(async () => {
    const salida: Record<string, string[]> = {}
    for (const nombre of await caches.keys()) {
      const cache = await caches.open(nombre)
      salida[nombre] = (await cache.keys()).map((r) => new URL(r.url).pathname)
    }
    return salida
  })
}

/** Junta las respuestas de la página que cumplen `filtro` mientras corre `accion`. */
export async function respuestasDurante(
  page: Page,
  filtro: (url: URL) => boolean,
  accion: () => Promise<unknown>,
): Promise<Response[]> {
  const respuestas: Response[] = []
  const oyente = (r: Response) => {
    if (filtro(new URL(r.url()))) respuestas.push(r)
  }
  page.on('response', oyente)
  try {
    await accion()
  } finally {
    page.off('response', oyente)
  }
  return respuestas
}

export interface ResultadoPedido {
  ok: boolean
  status: number
  cabeceras: Record<string, string>
  cuerpo: string
  /** Nombre del error si `fetch` rechazó (por ejemplo `TypeError` sin conexión). */
  error?: string
}

/** `fetch` desde la página: estado, cabeceras y cuerpo, o el nombre del error si rechazó. */
export async function pedirDesdeLaPagina(page: Page, url: string): Promise<ResultadoPedido> {
  return page.evaluate(async (u) => {
    try {
      const r = await fetch(u)
      return {
        ok: r.ok,
        status: r.status,
        cabeceras: Object.fromEntries(r.headers.entries()),
        cuerpo: await r.text(),
      }
    } catch (e) {
      return {
        ok: false,
        status: 0,
        cabeceras: {},
        cuerpo: '',
        error: e instanceof Error ? e.name : String(e),
      }
    }
  }, url)
}

/** Versión del plano publicada (va en la URL del SVG: `mapa-base.svg?v=<version>`). */
export async function versionPlano(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const r = await fetch('/data/plano.json')
    return ((await r.json()) as { version: string }).version
  })
}

/** Elige en la búsqueda abierta. */
async function elegir(page: Page, texto: string, opcion: RegExp) {
  await page.getByRole('combobox').fill(texto)
  await page.getByRole('option', { name: opcion }).first().tap()
}

/**
 * Pide la ruta Dirección de Alumnos → Dpto. de Cs. de la Salud (u otra) desde el inicio, sin esperar la ruta:
 * con el clima caído primero hay que elegir el criterio.
 */
export async function pedirRuta(
  page: Page,
  destino: [string, RegExp] = ['Salud', /^Dpto\. de Cs\. de la Salud/],
  origen: [string, RegExp] = ['Alumnos', /^Dirección de Alumnos/],
) {
  await page.getByRole('button', { name: 'Entradas', exact: true }).tap()
  await elegir(page, ...destino)
  await page.getByRole('button', { name: /^Cómo llegar$/ }).tap()
  await page.getByRole('button', { name: /^Punto de partida/ }).tap()
  await elegir(page, ...origen)
  await expect(page.getByTestId('contenido-ruta')).toBeVisible()
}

export const mapa = (page: Page) => page.locator('.mapa')

/** Nodos de la ruta dibujada (los publica la capa de la ruta en el DOM del mapa). */
export async function nodosRuta(page: Page): Promise<string[]> {
  await expect(mapa(page)).toHaveAttribute('data-ruta-nodos', /puerta-/)
  return ((await mapa(page).getAttribute('data-ruta-nodos')) ?? '').split(' ').filter(Boolean)
}

export const barraSinConexion = (page: Page) => page.locator('.aviso-conexion').getByRole('status')

/** Pide una URL desde la página y dice si respondió bien y si la atendió el service worker. */
export async function pedidoDesdeLaPaginaOk(page: Page, url: string) {
  const respuestas = await respuestasDurante(
    page,
    (u) => u.pathname === url,
    () => pedirDesdeLaPagina(page, url),
  )
  const r = respuestas.at(-1)
  return { ok: r?.ok() ?? false, deServiceWorker: r?.fromServiceWorker() ?? false }
}
