/**
 * Tipos públicos del clima (design.md de adaptar-ruta-al-clima, decisión 1).
 *
 * La recomendación solo conoce `EstadoClima`: cambiar el servicio simulado por uno real es cambiar
 * la implementación de `ServicioClima` que se inyecta al iniciar la app.
 */

/** Resultado de una consulta. Nunca hay excepciones: toda falla es `no-disponible` con su motivo. */
export type EstadoClima =
  | {
      tipo: 'ok'
      llueve: boolean
      descripcion: string
      fuente: 'simulado' | 'real'
      /** Fecha y hora ISO en que se obtuvo la respuesta. */
      obtenidoEn: string
    }
  | { tipo: 'no-disponible'; motivo: MotivoClimaNoDisponible }

export type MotivoClimaNoDisponible = 'timeout' | 'red' | 'respuesta-invalida'

export interface ServicioClima {
  /** Nunca rechaza la promesa. */
  consultar(signal?: AbortSignal): Promise<EstadoClima>
}

/** Escenarios del servicio simulado que elige el moderador de la prueba. */
export type EscenarioClima = 'seco' | 'lluvia' | 'error' | 'lento'

export const ESCENARIOS_CLIMA: readonly EscenarioClima[] = ['seco', 'lluvia', 'error', 'lento']

export const ESCENARIO_POR_DEFECTO: EscenarioClima = 'seco'

export function esEscenarioClima(valor: unknown): valor is EscenarioClima {
  return typeof valor === 'string' && (ESCENARIOS_CLIMA as readonly string[]).includes(valor)
}
