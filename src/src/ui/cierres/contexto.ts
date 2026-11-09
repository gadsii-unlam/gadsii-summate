/**
 * Controlador de cierres compartido por la interfaz. Lo crea `App` al arrancar (cuando llegan el
 * grafo y el catálogo) y lo leen la capa del mapa y los otros cambios (por ejemplo, el
 * orquestador de rutas de `adaptar-ruta-al-clima` con `excluidosDeControlador`).
 * Vale `null` mientras carga.
 */
import { createContext, useContext } from 'react'
import type { ControladorCierres, EstadoCierres } from '../../cierres/index.ts'
import { useEstadoCierres } from './useEstadoCierres.ts'

export const ContextoCierres = createContext<ControladorCierres | null>(null)

export function useControladorCierres(): ControladorCierres | null {
  return useContext(ContextoCierres)
}

/** Estado vigente (se actualiza cuando cambia el conjunto de cierres vigentes). */
export function useEstadoCierresActual(): EstadoCierres | null {
  return useEstadoCierres(useControladorCierres())
}
