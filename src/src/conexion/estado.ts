/**
 * Estado de la conexión (design.md de tolerar-senal-irregular, decisión 4).
 *
 * Se considera "sin conexión" cuando una petición real falla por red (`TypeError` de `fetch` o
 * timeout), cuando los cierres llegan desde la copia guardada por el service worker (la red falló
 * o tardó más de 4 s) o cuando llega el evento `offline`. `navigator.onLine` solo no alcanza: en
 * el Wi-Fi del campus puede decir "en línea" sin salida a internet. Vuelve a "en línea" solo con
 * una respuesta real de la red; el evento `online` avisa para volver a pedir los datos.
 *
 * Es lógica pura (sin React). La interfaz se suscribe con `suscribir`.
 */
import { origenDeRespuesta, type CabecerasMinimas } from './origen.ts'

export type EstadoConexion = 'en-linea' | 'sin-conexion'

/** Lo que se usa de `window` (para tests). */
export interface VentanaConexion {
  addEventListener(tipo: 'online' | 'offline', oyente: () => void): void
  removeEventListener(tipo: 'online' | 'offline', oyente: () => void): void
  navigator?: { onLine?: boolean }
}

/** Resultado de una consulta de clima (forma mínima de `EstadoClima` de `src/clima`). */
export type ResultadoClimaMinimo =
  { tipo: 'ok' } | { tipo: 'no-disponible'; motivo: 'timeout' | 'red' | 'respuesta-invalida' }

export interface OpcionesEnvoltura {
  /**
   * Si la petición no terminó en este tiempo, se informa "sin conexión" aunque después responda
   * (una respuesta posterior vuelve a "en línea").
   */
  timeoutMs?: number
}

export interface MonitorConexion {
  readonly estado: EstadoConexion
  /** Se llama con cada cambio de estado. Devuelve la función para desuscribirse. */
  suscribir(oyente: (estado: EstadoConexion) => void): () => void
  /** Se llama con el evento `online`: es el momento de volver a pedir cierres y clima. */
  alVolverLaRed(oyente: () => void): () => void
  /** Una petición rechazó. Solo cuenta si es una falla de red o un timeout (`esFallaDeRed`). */
  reportarFalla(error: unknown): void
  /**
   * Llegó una respuesta. Si la sirvió el service worker desde la caché (`X-DQ-Origen: cache`), la
   * red no respondió: "sin conexión". Si no, "en línea".
   */
  reportarRespuesta(respuesta?: { headers?: CabecerasMinimas }): void
  /** Resultado del servicio de clima: `red` o `timeout` → sin conexión; `ok` → en línea. */
  reportarClima(resultado: ResultadoClimaMinimo): void
  /**
   * Envuelve un `fetch` para que informe solo cada resultado. Sirve para `cargarCierres`
   * (`opciones.fetch`) y para `crearServicioClimaSimulado` (`opciones.fetch`).
   */
  envolverFetch<A extends unknown[], R>(
    obtener: (...args: A) => Promise<R>,
    opciones?: OpcionesEnvoltura,
  ): (...args: A) => Promise<R>
  /** Quita los oyentes de `online` y `offline`. */
  destruir(): void
}

/**
 * `true` si el error es de red o de tiempo agotado: `TypeError` (lo que lanza `fetch` sin
 * conexión), `TimeoutError` o un error cuyo mensaje empieza con "timeout". Una cancelación
 * (`AbortError`) no cuenta: la pidió la app.
 */
export function esFallaDeRed(error: unknown): boolean {
  if (error instanceof TypeError) return true
  if (typeof error !== 'object' || error === null) return false
  const { name, message } = error as { name?: unknown; message?: unknown }
  if (name === 'AbortError') return false
  if (name === 'TimeoutError' || name === 'ErrorTimeout') return true
  return typeof message === 'string' && /^timeout\b/i.test(message)
}

function ventanaPorDefecto(): VentanaConexion | undefined {
  return typeof window === 'undefined' ? undefined : window
}

export interface OpcionesMonitor {
  /** Por defecto `window` (sin `window`, no escucha eventos). */
  ventana?: VentanaConexion
}

export function crearMonitorConexion(opciones: OpcionesMonitor = {}): MonitorConexion {
  const ventana = 'ventana' in opciones ? opciones.ventana : ventanaPorDefecto()
  let estado: EstadoConexion = ventana?.navigator?.onLine === false ? 'sin-conexion' : 'en-linea'
  const oyentes = new Set<(e: EstadoConexion) => void>()
  const oyentesRed = new Set<() => void>()

  function cambiar(nuevo: EstadoConexion) {
    if (nuevo === estado) return
    estado = nuevo
    for (const o of [...oyentes]) o(estado)
  }

  const alOffline = () => cambiar('sin-conexion')
  const alOnline = () => {
    for (const o of [...oyentesRed]) o()
  }
  ventana?.addEventListener('offline', alOffline)
  ventana?.addEventListener('online', alOnline)

  const monitor: MonitorConexion = {
    get estado() {
      return estado
    },
    suscribir(oyente) {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    alVolverLaRed(oyente) {
      oyentesRed.add(oyente)
      return () => oyentesRed.delete(oyente)
    },
    reportarFalla(error) {
      if (esFallaDeRed(error)) cambiar('sin-conexion')
    },
    reportarRespuesta(respuesta) {
      const origen = respuesta?.headers ? origenDeRespuesta(respuesta.headers).origen : 'red'
      cambiar(origen === 'cache' ? 'sin-conexion' : 'en-linea')
    },
    reportarClima(resultado) {
      if (resultado.tipo === 'ok') cambiar('en-linea')
      else if (resultado.motivo === 'red' || resultado.motivo === 'timeout') {
        cambiar('sin-conexion')
      }
    },
    envolverFetch(obtener, op = {}) {
      return async (...args) => {
        let terminada = false
        const temporizador =
          op.timeoutMs === undefined
            ? undefined
            : setTimeout(() => {
                if (!terminada) cambiar('sin-conexion')
              }, op.timeoutMs)
        try {
          const respuesta = await obtener(...args)
          monitor.reportarRespuesta(
            typeof respuesta === 'object' && respuesta !== null && 'headers' in respuesta
              ? (respuesta as { headers?: CabecerasMinimas })
              : undefined,
          )
          return respuesta
        } catch (error) {
          monitor.reportarFalla(error)
          throw error
        } finally {
          terminada = true
          clearTimeout(temporizador)
        }
      }
    },
    destruir() {
      ventana?.removeEventListener('offline', alOffline)
      ventana?.removeEventListener('online', alOnline)
      oyentes.clear()
      oyentesRed.clear()
    },
  }
  return monitor
}
