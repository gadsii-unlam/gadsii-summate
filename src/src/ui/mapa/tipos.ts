import type { ComponentType } from 'react'
import type { Caja, PlanoBase } from '../../datos/index.ts'

/** Espacio que tapan la tarjeta superior, la hoja o el panel lateral (px de pantalla). */
export interface Margenes {
  arriba: number
  abajo: number
  izquierda: number
  derecha: number
  /** Alto de la hoja colapsada: el encuadre del campus se calcula contra este valor. */
  abajoColapsada: number
}

/** Qué muestra el botón de recentrar en la vista activa. */
export type Encuadre =
  { tipo: 'campus' } | { tipo: 'lugar'; x: number; y: number } | { tipo: 'ruta'; caja: Caja }

/** Contrato entre la pantalla y el visor (el real con Leaflet o el doble de jsdom). */
export interface PropsMapa {
  plano: PlanoBase
  encuadre: Encuadre
  /** Pin rojo del lugar seleccionado (puerta principal), o `null`. */
  marcador: { x: number; y: number } | null
  margenes: Margenes
  /** Cambia cada vez que se toca el botón de recentrar. */
  recentrar: number
  escritorio: boolean
  /** Capas de otros cambios (ver `Integraciones.CapasMapa`). */
  Capas: ComponentType | null
}
