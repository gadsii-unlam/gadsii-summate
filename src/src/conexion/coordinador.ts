/**
 * Reintentar y reconexión (design.md de tolerar-senal-irregular, decisión 4), sin React.
 *
 * - "Reintentar": vuelve a pedir cierres y clima sin borrar origen, destino ni ruta. Si con los
 *   datos nuevos la ruta en pantalla cambia, la aplica (el usuario lo pidió) y avisa
 *   "Actualizamos la ruta con los datos nuevos".
 * - Al volver la red sola (`online`): pide los datos en segundo plano y **no** reemplaza la ruta.
 *   Si cambiaría, ofrece verla: "Hay cambios en tu ruta" o "Un tramo de tu ruta está cerrado".
 *
 * Si el clima sigue sin poder consultarse por falta de conexión, no se toca la ruta mostrada.
 */
import type { CalculoPrevio, OrquestadorRuta } from '../clima/index.ts'
import type { Criterio, RutaEncontrada } from '../rutas/index.ts'
import { compararRutas, type CambioRuta } from './cambios.ts'
import type { MonitorConexion } from './estado.ts'
import type { OrigenDatos } from './origen.ts'

/** La ruta que se ve en pantalla (la `SeleccionRuta` de la hoja). */
export interface RutaMostrada {
  clave: string
  criterio: Criterio
  elegida: RutaEncontrada
}

export interface EstadoCoordinador {
  reintentando: boolean
  /** Cambio detectado al reconectar, pendiente de que el usuario lo vea. */
  cambio: Exclude<CambioRuta, 'igual'> | null
  /** "Actualizamos la ruta con los datos nuevos" (se oculta solo). */
  rutaActualizada: boolean
  /** Origen de los cierres usados en este momento. */
  origenCierres: OrigenDatos | null
}

export interface OpcionesCoordinador {
  monitor: MonitorConexion
  orquestador: OrquestadorRuta
  /** La ruta que se ve ahora, o `null`. */
  rutaMostrada: () => RutaMostrada | null
  /**
   * Vuelve a cargar los cierres (y reemplaza el controlador de la app). Devuelve el origen de
   * los datos cargados, o `null` si todavía no se puede (sin grafo).
   */
  recargarCierres: () => Promise<OrigenDatos | null>
  /** Descarta el clima guardado (5 min) para volver a consultar. */
  invalidarClima: () => void
  /** Cuánto se ve "Actualizamos la ruta…" (por defecto 6 s). */
  duracionAvisoMs?: number
  /**
   * Después del evento `online`, si la primera actualización todavía falla (la red tarda en
   * volver), se reintenta sola cada tanto (por defecto 3 s, hasta 3 veces).
   */
  esperaReconexionMs?: number
  intentosReconexion?: number
}

export interface CoordinadorConexion {
  estado(): EstadoCoordinador
  suscribir(oyente: () => void): () => void
  /** "Reintentar" de la barra "Sin conexión". */
  reintentar(): Promise<void>
  /** Actualización en segundo plano (evento `online`, o después de restaurar un recorrido). */
  actualizarEnSegundoPlano(): Promise<void>
  /** "Ver ruta actualizada". */
  verRutaActualizada(): void
  /** El origen de los cierres de la primera carga. */
  registrarOrigenCierres(origen: OrigenDatos): void
  /** Cambió la ruta que se ve (otro origen o destino): se descarta el cambio pendiente. */
  rutaCambiada(clave: string | null): void
  destruir(): void
}

const rutaDeCriterio = (c: CalculoPrevio, criterio: Criterio) =>
  criterio === 'mas-corta' ? c.rutas.masCorta : c.rutas.resguardada

function sinConexionEnClima(c: CalculoPrevio): boolean {
  return c.clima.tipo === 'no-disponible' && c.clima.motivo !== 'respuesta-invalida'
}

export function crearCoordinadorConexion(opciones: OpcionesCoordinador): CoordinadorConexion {
  const { monitor, orquestador } = opciones
  const duracion = opciones.duracionAvisoMs ?? 6000
  let estado: EstadoCoordinador = {
    reintentando: false,
    cambio: null,
    rutaActualizada: false,
    origenCierres: null,
  }
  let pendiente: { calculo: CalculoPrevio; clave: string } | null = null
  let claveVista: string | null = null
  let enCurso: Promise<void> | null = null
  let temporizador: ReturnType<typeof setTimeout> | undefined
  const oyentes = new Set<() => void>()

  function publicar(cambios: Partial<EstadoCoordinador>) {
    estado = { ...estado, ...cambios }
    for (const o of [...oyentes]) o()
  }

  function avisarActualizada() {
    clearTimeout(temporizador)
    publicar({ rutaActualizada: true, cambio: null })
    temporizador = setTimeout(() => publicar({ rutaActualizada: false }), duracion)
  }

  /** Recarga cierres y clima; devuelve el cálculo nuevo y la comparación con la ruta mostrada. */
  async function recargar(): Promise<{
    calculo: CalculoPrevio
    mostrada: RutaMostrada
    cambio: CambioRuta
  } | null> {
    opciones.invalidarClima()
    const origen = await opciones.recargarCierres()
    if (origen) publicar({ origenCierres: origen })
    const mostrada = opciones.rutaMostrada()
    if (!mostrada) return null
    const calculo = await orquestador.previsualizar()
    if (!calculo || sinConexionEnClima(calculo)) return null
    // Si mientras tanto cambió la ruta que se ve, no se compara.
    if (opciones.rutaMostrada()?.clave !== mostrada.clave) return null
    const nueva = rutaDeCriterio(calculo, mostrada.criterio)
    const cambio = compararRutas(
      mostrada.elegida,
      nueva.tipo === 'ruta' ? nueva : null,
      calculo.excluidos,
    )
    return { calculo, mostrada, cambio }
  }

  function unaVez(tarea: () => Promise<void>): Promise<void> {
    if (enCurso) return enCurso
    enCurso = tarea().finally(() => {
      enCurso = null
    })
    return enCurso
  }

  const esperaReconexion = opciones.esperaReconexionMs ?? 3000
  const intentosReconexion = opciones.intentosReconexion ?? 3
  let reconexion: ReturnType<typeof setTimeout> | undefined

  function alVolverLaRed(intento = 1) {
    clearTimeout(reconexion)
    void coordinador.actualizarEnSegundoPlano().then(() => {
      if (monitor.estado === 'sin-conexion' && intento < intentosReconexion) {
        reconexion = setTimeout(() => alVolverLaRed(intento + 1), esperaReconexion)
      }
    })
  }

  const quitarRed = monitor.alVolverLaRed(() => alVolverLaRed())
  const quitarEstado = monitor.suscribir((e) => {
    if (e === 'sin-conexion') opciones.invalidarClima()
  })

  const coordinador: CoordinadorConexion = {
    estado: () => estado,
    suscribir(oyente) {
      oyentes.add(oyente)
      return () => oyentes.delete(oyente)
    },
    reintentar() {
      if (estado.reintentando) return enCurso ?? Promise.resolve()
      publicar({ reintentando: true })
      const tarea = async () => {
        try {
          const r = await recargar()
          if (r && r.cambio !== 'igual' && orquestador.aplicar(r.calculo)) {
            pendiente = null
            avisarActualizada()
          }
        } catch (error) {
          console.warn('[conexion] no se pudo reintentar', error)
        } finally {
          publicar({ reintentando: false })
        }
      }
      // Un reintento espera a la actualización en segundo plano que ya estuviera corriendo.
      return (enCurso ?? Promise.resolve()).then(() => unaVez(tarea))
    },
    actualizarEnSegundoPlano() {
      // Si hay un reintento en curso, se actualiza después (puede haber empezado sin red).
      return (enCurso ?? Promise.resolve()).then(() =>
        unaVez(async () => {
          try {
            const r = await recargar()
            if (!r) return
            if (r.cambio === 'igual') {
              pendiente = null
              if (estado.cambio) publicar({ cambio: null })
              return
            }
            pendiente = { calculo: r.calculo, clave: r.mostrada.clave }
            publicar({ cambio: r.cambio })
          } catch (error) {
            console.warn('[conexion] no se pudo actualizar en segundo plano', error)
          }
        }),
      )
    },
    verRutaActualizada() {
      const p = pendiente
      pendiente = null
      if (p && p.clave === claveVista && orquestador.aplicar(p.calculo)) avisarActualizada()
      else {
        publicar({ cambio: null })
        void orquestador.recalcular()
      }
    },
    registrarOrigenCierres(origen) {
      publicar({ origenCierres: origen })
    },
    rutaCambiada(clave) {
      if (clave === claveVista) return
      claveVista = clave
      if (pendiente && pendiente.clave !== clave) {
        pendiente = null
        publicar({ cambio: null })
      }
    },
    destruir() {
      quitarRed()
      quitarEstado()
      clearTimeout(temporizador)
      clearTimeout(reconexion)
      oyentes.clear()
    },
  }
  return coordinador
}
