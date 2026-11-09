/**
 * Carga de los cierres (decisión 4): se piden por red a `/data/cierres.json` (timeout 5 s) y, si
 * el pedido falla, la respuesta no es JSON o no tiene la forma esperada, se usa la copia incluida
 * en el bundle al compilar. Nunca queda un estado "sin cierres" por un error de red.
 */
import cierresIncluidos from '../../public/data/cierres.json'
import { origenDeRespuesta, origenRespaldo } from '../conexion/origen.ts'
import type { GrafoRuteable } from '../rutas/index.ts'
import type { Cierre, ProblemaCierres } from './tipos.ts'
import { indexarGrafo, validarCierres, type IndiceGrafo } from './validar.ts'

export const URL_CIERRES = '/data/cierres.json'
export const TIMEOUT_CIERRES_MS = 5000

type RespuestaMinima = Pick<Response, 'ok' | 'status' | 'json'> & {
  /** Para leer la marca del service worker (`X-DQ-Origen`). Opcional en los tests. */
  headers?: Pick<Headers, 'get'>
}

export interface OpcionesCargaCierres {
  /** Por defecto `URL_CIERRES`. */
  url?: string
  /** `fetch` a usar (para tests). Por defecto el global. */
  fetch?: (url: string, init?: { signal?: AbortSignal }) => Promise<RespuestaMinima>
  /** Por defecto 5000 ms. */
  timeoutMs?: number
  /** Contenido de la copia incluida (para tests). Por defecto `public/data/cierres.json` del build. */
  respaldo?: unknown
  /** Destino de las advertencias (para tests). Por defecto `console.warn`. */
  advertir?: (mensaje: string) => void
}

export interface CierresCargados {
  /** Cierres validados (vigentes o no: la vigencia se evalúa en cada uso). */
  cierres: Cierre[]
  /** De dónde salieron: el archivo publicado o la copia incluida en la app. */
  fuente: 'red' | 'incluida'
  /**
   * Detalle del origen (tolerar-senal-irregular, decisión 3): `red`, `cache` (la última copia que
   * guardó el service worker, porque la red falló o tardó) o `respaldo` (la copia incluida).
   */
  origen: 'red' | 'cache' | 'respaldo'
  /** Cuándo se guardó la copia usada (ISO 8601), o `null` si vienen de la red o no se sabe. */
  guardadoEn: string | null
  problemas: ProblemaCierres[]
}

const advertirPorDefecto = (mensaje: string) => console.warn(mensaje)

/** Pide el archivo con timeout. Lanza si falla la red, el HTTP no es 2xx o no es JSON. */
async function pedir(
  url: string,
  obtener: NonNullable<OpcionesCargaCierres['fetch']>,
  timeoutMs: number,
): Promise<{ datos: unknown; headers: Pick<Headers, 'get'> | undefined }> {
  const control = typeof AbortController === 'undefined' ? null : new AbortController()
  let temporizador: ReturnType<typeof setTimeout> | undefined
  const vencido = new Promise<never>((_, rechazar) => {
    temporizador = setTimeout(() => {
      control?.abort()
      rechazar(new Error(`timeout de ${timeoutMs} ms`))
    }, timeoutMs)
  })
  try {
    return await Promise.race([
      (async () => {
        const respuesta = await obtener(url, control ? { signal: control.signal } : undefined)
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`)
        return { datos: (await respuesta.json()) as unknown, headers: respuesta.headers }
      })(),
      vencido,
    ])
  } finally {
    clearTimeout(temporizador)
  }
}

function reportar(problemas: readonly ProblemaCierres[], advertir: (m: string) => void) {
  for (const p of problemas) {
    if (p.codigo !== 'forma-invalida') advertir(`[cierres] ${p.mensaje}`)
  }
}

function usarIncluida(
  respaldo: unknown,
  indice: IndiceGrafo,
  advertir: (m: string) => void,
): CierresCargados {
  const r = validarCierres(respaldo, indice)
  if (!r.formaValida) advertir('[cierres] la copia incluida tampoco es válida: no hay cierres')
  reportar(r.problemas, advertir)
  const actualizado =
    typeof respaldo === 'object' && respaldo !== null
      ? (respaldo as { actualizado?: unknown }).actualizado
      : undefined
  const copia = origenRespaldo(actualizado)
  const guardadoEn = copia.origen === 'red' ? null : copia.guardadoEn
  return {
    cierres: r.cierres,
    fuente: 'incluida',
    origen: 'respaldo',
    guardadoEn,
    problemas: r.problemas,
  }
}

/**
 * Descarga y valida los cierres contra el grafo. Nunca rechaza: ante cualquier falla usa la
 * copia incluida y lo advierte en consola (`[cierres] …`). Los ids desconocidos se ignoran con
 * advertencia y el resto del cierre se aplica.
 */
export async function cargarCierres(
  grafo: GrafoRuteable,
  opciones: OpcionesCargaCierres = {},
): Promise<CierresCargados> {
  const url = opciones.url ?? URL_CIERRES
  const advertir = opciones.advertir ?? advertirPorDefecto
  const respaldo = 'respaldo' in opciones ? opciones.respaldo : cierresIncluidos
  const obtener = opciones.fetch ?? ((u: string, init?: { signal?: AbortSignal }) => fetch(u, init))
  const indice = indexarGrafo(grafo)

  let datos: unknown
  let headers: Pick<Headers, 'get'> | undefined
  try {
    ;({ datos, headers } = await pedir(url, obtener, opciones.timeoutMs ?? TIMEOUT_CIERRES_MS))
  } catch (error) {
    advertir(
      `[cierres] no se pudo descargar ${url} (${error instanceof Error ? error.message : String(error)}); se usa la copia incluida`,
    )
    return usarIncluida(respaldo, indice, advertir)
  }

  const r = validarCierres(datos, indice)
  if (!r.formaValida) {
    advertir(`[cierres] ${url} no tiene la forma esperada; se usa la copia incluida`)
    return usarIncluida(respaldo, indice, advertir)
  }
  reportar(r.problemas, advertir)
  const origen = headers ? origenDeRespuesta(headers) : ({ origen: 'red' } as const)
  return {
    cierres: r.cierres,
    fuente: 'red',
    origen: origen.origen === 'cache' ? 'cache' : 'red',
    guardadoEn: origen.origen === 'cache' ? origen.guardadoEn : null,
    problemas: r.problemas,
  }
}
