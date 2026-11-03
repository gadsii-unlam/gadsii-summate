/** Estado de un `MonitorConexion` (src/conexion) para React. */
import { useSyncExternalStore } from 'react'
import type { EstadoConexion, MonitorConexion } from '../../conexion/index.ts'

export function useConexion(monitor: MonitorConexion): EstadoConexion {
  return useSyncExternalStore(
    (avisar) => monitor.suscribir(avisar),
    () => monitor.estado,
    () => monitor.estado,
  )
}
