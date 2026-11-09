/**
 * Lo que la pantalla comparte con el contenido de la hoja y las capas del mapa de otros cambios:
 * los márgenes que tapan la tarjeta y la hoja (para encuadrar) y un pedido de altura de la hoja
 * (por ejemplo, expandirla al abrir las indicaciones).
 */
import { createContext, useContext } from 'react'
import type { Altura } from '../hoja/anclaje.ts'
import type { Margenes } from '../mapa/tipos.ts'

export interface VistaPantalla {
  margenes: Margenes
  escritorio: boolean
  /** Lleva la hoja a esa altura (en escritorio no hace nada). */
  pedirAltura: (altura: Altura) => void
}

export const ContextoVistaPantalla = createContext<VistaPantalla | null>(null)

export function useVistaPantalla(): VistaPantalla | null {
  return useContext(ContextoVistaPantalla)
}
