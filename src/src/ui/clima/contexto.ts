/**
 * Orquestador de rutas compartido por la interfaz (adaptar-ruta-al-clima). Lo crea `App` y lo
 * consumen `AvisoClima` y el `ContenidoRuta` de `mostrar-ruta-e-indicaciones`.
 */
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { EstadoOrquestador, OrquestadorRuta } from '../../clima/index.ts'

export const ContextoOrquestadorRuta = createContext<OrquestadorRuta | null>(null)

const INACTIVO: EstadoOrquestador = { tipo: 'inactivo' }
const sinSuscripcion = () => () => {}
const inactivo = () => INACTIVO

/** El orquestador (`calcular`, `reintentar`, `elegirCriterio`…), o `null` fuera del proveedor. */
export function useOrquestadorRuta(): OrquestadorRuta | null {
  return useContext(ContextoOrquestadorRuta)
}

/** Estado vigente del orquestador; `inactivo` si no hay proveedor. */
export function useEstadoRuta(): EstadoOrquestador {
  const orquestador = useOrquestadorRuta()
  return useSyncExternalStore(
    orquestador ? orquestador.suscribir : sinSuscripcion,
    orquestador ? orquestador.estado : inactivo,
    orquestador ? orquestador.estado : inactivo,
  )
}

/**
 * Estado del orquestador solo si corresponde a este par de lugares (ids de `Lugar`); si no,
 * `inactivo`. Es lo que deberían usar `AvisoClima` y `ContenidoRuta`, que reciben `origen` y
 * `destino` por props.
 */
export function useEstadoRutaDe(origenId: string, destinoId: string): EstadoOrquestador {
  const estado = useEstadoRuta()
  if (estado.tipo === 'inactivo') return estado
  const { origenId: o, destinoId: d } = estado.consulta
  return o === origenId && d === destinoId ? estado : INACTIVO
}
