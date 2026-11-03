/**
 * Conexión de `tolerar-senal-irregular` con la app: coordinador de "Reintentar" y reconexión,
 * versión nueva, instalación y recorrido guardado. Lo usa `App` una sola vez y pasa `valor` a
 * `ContextoConexion`.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { OrquestadorRuta } from '../../clima/index.ts'
import {
  recorridoAGuardar,
  type CoordinadorConexion,
  type MonitorConexion,
} from '../../conexion/index.ts'
import { borrarRecorrido, guardarRecorrido } from '../../datos/persistencia.ts'
import type { Seleccion } from '../estado/pantalla.ts'
import type { VistaRuta } from '../ruta/conexion.ts'
import { EVENTO_FINALIZAR_VIAJE } from '../ruta/textos.ts'
import type { ValorConexion } from './contexto.ts'
import {
  contarRecorridoTerminado,
  debeSugerirInstalacion,
  leerRegistro,
  marcarSugerenciaMostrada,
} from './instalacion.ts'
import { useInstalacion } from './useInstalacion.ts'
import { useVersionNueva } from './useVersionNueva.ts'

export interface OpcionesSinConexionApp {
  monitor: MonitorConexion
  orquestador: OrquestadorRuta
  coordinador: CoordinadorConexion
  vistaRuta: VistaRuta
  /** `versionDatos(grafo, catalogo)`, o `null` mientras no cargó el grafo (no se guarda nada). */
  versionDatos: string | null
  mensajeRecorrido: string | null
}

export interface SinConexionApp {
  valor: ValorConexion
  /** Para `Pantalla.alCambiarSeleccion`. */
  alCambiarSeleccion: (seleccion: Seleccion) => void
}

export function useSinConexionApp(opciones: OpcionesSinConexionApp): SinConexionApp {
  const { monitor, orquestador, coordinador, vistaRuta, versionDatos, mensajeRecorrido } = opciones

  const estadoVista = useSyncExternalStore(vistaRuta.suscribir, vistaRuta.estado)
  const hayRutaEnPantalla = estadoVista.seleccion !== null
  useEffect(() => {
    coordinador.rutaCambiada(estadoVista.seleccion ? estadoVista.clave : null)
  }, [coordinador, estadoVista])

  // ---- Recorrido guardado (decisión 6) ----------------------------------------------------
  const seleccion = useRef<Seleccion | null>(null)
  /** Selección al tocar "Finalizar viaje": no se vuelve a guardar hasta que cambie. */
  const finalizada = useRef<Seleccion | null>(null)

  const guardar = useCallback(() => {
    const s = seleccion.current
    if (!versionDatos || !s || finalizada.current === s) return
    const { clave, seleccion: ruta } = vistaRuta.estado()
    const valor = recorridoAGuardar(
      versionDatos,
      s,
      clave && ruta ? { clave, ...ruta } : null,
      orquestador.estado(),
    )
    if (valor) guardarRecorrido(valor)
    else borrarRecorrido()
  }, [versionDatos, vistaRuta, orquestador])

  // Al mostrar una ruta y al cambiar de alternativa.
  useEffect(() => {
    if (estadoVista.seleccion) guardar()
  }, [estadoVista.seleccion, guardar])

  const alCambiarSeleccion = useCallback(
    (s: Seleccion) => {
      seleccion.current = s
      if (finalizada.current && finalizada.current !== s) finalizada.current = null
      guardar()
    },
    [guardar],
  )

  // ---- Instalación (decisión 8) -----------------------------------------------------------
  const instalacion = useInstalacion()
  const [registro, setRegistro] = useState(() => leerRegistro())

  useEffect(() => {
    const alFinalizar = () => {
      finalizada.current = seleccion.current
      borrarRecorrido()
      setRegistro(contarRecorridoTerminado())
    }
    window.addEventListener(EVENTO_FINALIZAR_VIAJE, alFinalizar)
    return () => window.removeEventListener(EVENTO_FINALIZAR_VIAJE, alFinalizar)
  }, [])

  const cerrarSugerencia = useCallback(() => {
    marcarSugerenciaMostrada()
    setRegistro(leerRegistro())
  }, [])

  // ---- Versión nueva (decisión 7) ---------------------------------------------------------
  const version = useVersionNueva()

  const valor = useMemo<ValorConexion>(
    () => ({
      monitor,
      coordinador,
      hayRutaEnPantalla,
      version,
      instalacion,
      sugerenciaInstalacion: {
        visible: debeSugerirInstalacion({
          puedeInstalar: instalacion.puedeInstalar,
          hayRutaEnPantalla,
          registro,
        }),
        cerrar: cerrarSugerencia,
      },
      mensajeRecorrido,
    }),
    [
      monitor,
      coordinador,
      hayRutaEnPantalla,
      version,
      instalacion,
      registro,
      cerrarSugerencia,
      mensajeRecorrido,
    ],
  )

  return { valor, alCambiarSeleccion }
}
