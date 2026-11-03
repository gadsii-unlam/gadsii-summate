/** Contexto de React del estado de pantalla (`PantallaProvider` / `usePantalla`). */
import { createContext, useContext } from 'react'
import type { ControladorPantalla, Instantanea } from './controlador.ts'
import type { EventoPantalla } from './pantalla.ts'

export interface ValorPantalla extends Instantanea {
  despachar: (evento: EventoPantalla) => void
  volver: () => void
  cerrar: () => void
  cerrarPrimerUso: () => void
  controlador: ControladorPantalla
}

export const ContextoPantalla = createContext<ValorPantalla | null>(null)

export function usePantalla(): ValorPantalla {
  const valor = useContext(ContextoPantalla)
  if (!valor) throw new Error('usePantalla fuera de <PantallaProvider>')
  return valor
}

/** Anunciador para el lector de pantalla (región `aria-live`). */
export const ContextoAnunciar = createContext<(texto: string) => void>(() => {})

export function useAnunciar(): (texto: string) => void {
  return useContext(ContextoAnunciar)
}
