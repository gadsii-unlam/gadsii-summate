/**
 * Lo que comparten la app y los avisos de `tolerar-senal-irregular`. Lo arma `App`; sin
 * proveedor, `AvisosApp` y `AyudaInstalar` no muestran nada.
 */
import { createContext, useContext, useSyncExternalStore } from 'react'
import type {
  CoordinadorConexion,
  EstadoCoordinador,
  MonitorConexion,
} from '../../conexion/index.ts'
import type { Instalacion } from './useInstalacion.ts'

export interface ValorConexion {
  monitor: MonitorConexion
  coordinador: CoordinadorConexion
  /** Hay una ruta en pantalla (recorrido en curso). */
  hayRutaEnPantalla: boolean
  version: { hayVersionNueva: boolean; actualizar: () => void; postergar: () => void }
  instalacion: Instalacion
  sugerenciaInstalacion: { visible: boolean; cerrar: () => void }
  /** "No pudimos recuperar tu recorrido anterior", o `null`. */
  mensajeRecorrido: string | null
}

export const ContextoConexion = createContext<ValorConexion | null>(null)

export function useValorConexion(): ValorConexion | null {
  return useContext(ContextoConexion)
}

const VACIO: EstadoCoordinador = {
  reintentando: false,
  cambio: null,
  rutaActualizada: false,
  origenCierres: null,
}
const sinSuscripcion = () => () => {}
const vacio = () => VACIO

export function useEstadoCoordinador(coordinador: CoordinadorConexion | null): EstadoCoordinador {
  return useSyncExternalStore(
    coordinador ? coordinador.suscribir : sinSuscripcion,
    coordinador ? coordinador.estado : vacio,
    coordinador ? coordinador.estado : vacio,
  )
}
