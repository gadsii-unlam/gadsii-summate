/**
 * Suscribe un componente al controlador de cierres (`crearControladorCierres`): se vuelve a
 * renderizar cuando cambia el conjunto de cierres vigentes (cada 60 s se reevalúa).
 */
import { useSyncExternalStore } from 'react'
import type { ControladorCierres, EstadoCierres } from '../../cierres/index.ts'

const sinSuscripcion = () => () => {}
const nulo = () => null

export function useEstadoCierres(controlador: ControladorCierres | null): EstadoCierres | null {
  return useSyncExternalStore(
    controlador ? controlador.suscribir : sinSuscripcion,
    controlador ? controlador.estado : nulo,
  )
}
