import { URL_GRAFO, type GrafoCampus } from '../datos/index.ts'
import { prepararGrafoRuteable } from './grafo-ruteable.ts'
import type { GrafoRuteable } from './tipos.ts'

export interface OpcionesCarga {
  /** URL del grafo. Por defecto `URL_GRAFO` (`/data/grafo.json`). */
  url?: string
  /** `fetch` a usar (para tests). Por defecto el global. */
  fetch?: (url: string) => Promise<Pick<Response, 'ok' | 'status' | 'json'>>
}

let enCurso: { url: string; promesa: Promise<GrafoRuteable> } | null = null

/**
 * Descarga `grafo.json` y lo prepara para rutear **una sola vez**: las llamadas siguientes con la
 * misma URL devuelven la misma promesa (el mismo `GrafoRuteable`). Si la carga falla, la próxima
 * llamada lo vuelve a intentar.
 */
export function cargarGrafoRuteable(opciones: OpcionesCarga = {}): Promise<GrafoRuteable> {
  const url = opciones.url ?? URL_GRAFO
  if (enCurso?.url === url) return enCurso.promesa
  const obtener = opciones.fetch ?? ((u: string) => fetch(u))
  const promesa = (async () => {
    const respuesta = await obtener(url)
    if (!respuesta.ok)
      throw new Error(`No se pudo cargar el grafo (${url}): HTTP ${respuesta.status}`)
    return prepararGrafoRuteable((await respuesta.json()) as GrafoCampus)
  })()
  enCurso = { url, promesa }
  promesa.catch(() => {
    if (enCurso?.promesa === promesa) enCurso = null
  })
  return promesa
}

/** Olvida el grafo cargado (para tests o si cambian los datos). */
export function olvidarGrafoRuteable(): void {
  enCurso = null
}
