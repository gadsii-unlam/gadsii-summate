import type { EscenarioClima, EstadoClima, ServicioClima } from './tipos.ts'

/** Tiempo máximo de una consulta, incluida la espera simulada de `lento` (decisión 4). */
export const TIMEOUT_CLIMA_MS = 5000

/** Espera que el escenario `lento` agrega antes de pedir su archivo (decisión 2). */
export const ESPERA_LENTO_MS = 3000

export const URL_BASE_CLIMA = '/api/clima'

/** Lo mínimo de `fetch` que usa el servicio (para inyectar uno simulado en los tests). */
export type FetchClima = (
  url: string,
  init: { signal: AbortSignal; cache: RequestCache; headers: Record<string, string> },
) => Promise<Pick<Response, 'ok' | 'status' | 'text'>>

export interface OpcionesServicioSimulado {
  /** Escenario activo en el momento de cada consulta (por ejemplo, `control.actual`). */
  escenario: () => EscenarioClima
  fetch?: FetchClima
  urlBase?: string
  timeoutMs?: number
  esperaLentoMs?: number
  /** Reloj para `obtenidoEn`. */
  ahora?: () => Date
}

class ErrorTimeout extends Error {}

/**
 * Servicio simulado: pide `/api/clima/<escenario>.json` por red, como si fuera una API real.
 * Valida HTTP 2xx, JSON y `llueve` booleano; corta a los 5 s con `AbortController`. Toda falla
 * se devuelve como `no-disponible`:
 * - `timeout`: pasaron `timeoutMs` (contando la espera de `lento`).
 * - `red`: `fetch` rechazó (sin conexión) o la consulta se canceló con `signal` desde afuera.
 * - `respuesta-invalida`: estado HTTP no 2xx, cuerpo que no es JSON (por ejemplo el
 *   `index.html` del fallback de la SPA) o sin `llueve` booleano (escenario `error`).
 */
export function crearServicioClimaSimulado(opciones: OpcionesServicioSimulado): ServicioClima {
  const {
    escenario,
    urlBase = URL_BASE_CLIMA,
    timeoutMs = TIMEOUT_CLIMA_MS,
    esperaLentoMs = ESPERA_LENTO_MS,
    ahora = () => new Date(),
  } = opciones
  const obtener: FetchClima = opciones.fetch ?? ((url, init) => fetch(url, init))

  return {
    async consultar(signal) {
      const nombre = escenario()
      const control = new AbortController()
      let vencio = false
      const temporizador = setTimeout(() => {
        vencio = true
        control.abort(new ErrorTimeout('timeout'))
      }, timeoutMs)
      const alCancelarAfuera = () => control.abort(signal?.reason)
      if (signal?.aborted) control.abort(signal.reason)
      else signal?.addEventListener('abort', alCancelarAfuera, { once: true })

      try {
        if (nombre === 'lento') await esperar(esperaLentoMs, control.signal)
        const respuesta = await carrera(
          obtener(`${urlBase}/${nombre}.json`, {
            signal: control.signal,
            cache: 'no-store',
            headers: { Accept: 'application/json' },
          }),
          control.signal,
        )
        if (!respuesta.ok) return noDisponible('respuesta-invalida')
        const texto = await carrera(respuesta.text(), control.signal)
        return interpretar(texto, ahora())
      } catch {
        return noDisponible(vencio ? 'timeout' : 'red')
      } finally {
        clearTimeout(temporizador)
        signal?.removeEventListener('abort', alCancelarAfuera)
      }
    },
  }
}

/** Valida el cuerpo de la respuesta simulada (`{ llueve: boolean, descripcion?: string }`). */
export function interpretar(texto: string, obtenidoEn: Date): EstadoClima {
  let cuerpo: unknown
  try {
    cuerpo = JSON.parse(texto)
  } catch {
    return noDisponible('respuesta-invalida')
  }
  if (typeof cuerpo !== 'object' || cuerpo === null) return noDisponible('respuesta-invalida')
  const { llueve, descripcion } = cuerpo as { llueve?: unknown; descripcion?: unknown }
  if (typeof llueve !== 'boolean') return noDisponible('respuesta-invalida')
  return {
    tipo: 'ok',
    llueve,
    descripcion:
      typeof descripcion === 'string' && descripcion.trim() !== ''
        ? descripcion
        : llueve
          ? 'Lluvia'
          : 'Sin lluvia',
    fuente: 'simulado',
    obtenidoEn: obtenidoEn.toISOString(),
  }
}

function noDisponible(motivo: 'timeout' | 'red' | 'respuesta-invalida'): EstadoClima {
  return { tipo: 'no-disponible', motivo }
}

function esperar(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolver, rechazar) => {
    if (signal.aborted) return rechazar(signal.reason)
    const t = setTimeout(() => {
      signal.removeEventListener('abort', alAbortar)
      resolver()
    }, ms)
    function alAbortar() {
      clearTimeout(t)
      rechazar(signal.reason)
    }
    signal.addEventListener('abort', alAbortar, { once: true })
  })
}

/** Rechaza apenas se aborta `signal`, aunque la promesa original (un `fetch` que ignora la señal) no lo haga. */
function carrera<T>(promesa: Promise<T>, signal: AbortSignal): Promise<T> {
  return new Promise<T>((resolver, rechazar) => {
    if (signal.aborted) return rechazar(signal.reason)
    const alAbortar = () => rechazar(signal.reason)
    signal.addEventListener('abort', alAbortar, { once: true })
    promesa.then(
      (v) => {
        signal.removeEventListener('abort', alAbortar)
        resolver(v)
      },
      (e: unknown) => {
        signal.removeEventListener('abort', alAbortar)
        rechazar(e)
      },
    )
  })
}
