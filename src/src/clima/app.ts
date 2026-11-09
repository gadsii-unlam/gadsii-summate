import { conCacheDeClima, type ServicioClimaConCache } from './cache.ts'
import { crearControlEscenario, type AlmacenSesion, type ControlEscenario } from './escenario.ts'
import { crearServicioClimaSimulado, type FetchClima } from './servicio-simulado.ts'

export interface ClimaDeLaApp {
  /** Escenario de la sesión (lo usa el panel de prueba). */
  control: ControlEscenario
  /** Servicio simulado con la reutilización de 5 min (se invalida sola al cambiar el escenario). */
  servicio: ServicioClimaConCache
  /**
   * Avisa cada cambio de escenario (para llamar a `orquestador.recalcular()` con una ruta en
   * pantalla). Devuelve la función para desuscribirse.
   */
  alCambiarEscenario(accion: () => void): () => void
}

/**
 * Arma el clima de la app: control del escenario (`?clima=` > `sessionStorage` > `seco`) y
 * servicio simulado con caché. Para pasar a una API real se reemplaza solo `servicio`.
 */
export function crearClimaDeLaApp(
  opciones: {
    busqueda?: string
    almacen?: AlmacenSesion | null
    fetch?: FetchClima
    /** Sin conexión no se reutiliza el clima guardado (ver `conCacheDeClima`). */
    sinConexion?: () => boolean
  } = {},
): ClimaDeLaApp {
  const control = crearControlEscenario({ busqueda: opciones.busqueda, almacen: opciones.almacen })
  const simulado = crearServicioClimaSimulado({ escenario: control.actual, fetch: opciones.fetch })
  const servicio = conCacheDeClima(simulado, {
    escenario: control.actual,
    ...(opciones.sinConexion ? { omitirGuardado: opciones.sinConexion } : {}),
  })
  return {
    control,
    servicio,
    alCambiarEscenario(accion) {
      return control.suscribir(() => {
        servicio.invalidar()
        accion()
      })
    },
  }
}
