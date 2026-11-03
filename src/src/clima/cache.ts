import type { EscenarioClima, EstadoClima, ServicioClima } from './tipos.ts'

/** Cuánto se reutiliza una respuesta `ok` (decisión 4). */
export const VIGENCIA_CLIMA_MS = 5 * 60_000

export interface OpcionesCacheClima {
  /** Escenario activo: si cambia, la respuesta guardada deja de valer. */
  escenario: () => EscenarioClima
  vigenciaMs?: number
  ahora?: () => number
  /**
   * Si devuelve `true`, no se reutiliza la respuesta guardada (tolerar-senal-irregular: sin
   * conexión nunca se usa un clima de una consulta anterior; se va a la red y falla).
   */
  omitirGuardado?: () => boolean
}

export interface ServicioClimaConCache extends ServicioClima {
  /** Descarta la respuesta guardada (la próxima consulta va a la red). */
  invalidar(): void
}

/**
 * Envuelve un `ServicioClima` para reutilizar una respuesta `ok` durante 5 minutos mientras no
 * cambie el escenario. Las respuestas `no-disponible` nunca se guardan: "Reintentar" siempre
 * vuelve a consultar.
 */
export function conCacheDeClima(
  servicio: ServicioClima,
  opciones: OpcionesCacheClima,
): ServicioClimaConCache {
  const {
    escenario,
    vigenciaMs = VIGENCIA_CLIMA_MS,
    ahora = () => Date.now(),
    omitirGuardado = () => false,
  } = opciones
  let guardado: { escenario: EscenarioClima; en: number; estado: EstadoClima } | null = null

  return {
    async consultar(signal) {
      const actual = escenario()
      if (omitirGuardado()) guardado = null
      if (guardado && guardado.escenario === actual && ahora() - guardado.en < vigenciaMs) {
        return guardado.estado
      }
      const estado = await servicio.consultar(signal)
      if (estado.tipo === 'ok') guardado = { escenario: actual, en: ahora(), estado }
      else if (guardado?.escenario === actual) guardado = null
      return estado
    },
    invalidar() {
      guardado = null
    },
  }
}
