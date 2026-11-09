/**
 * Constantes del visor (design.md, D4). Este archivo no importa Leaflet: lo usan también los
 * tests de componentes con el doble del mapa.
 */
import type { Caja, PlanoBase } from '../../datos/index.ts'

/**
 * Panes de Leaflet, de abajo hacia arriba. Otros cambios montan sus capas en `cierres`
 * (`aplicar-cierres-temporales`) y `ruta` (`mostrar-ruta-e-indicaciones`).
 */
export const PANES = {
  plano: { nombre: 'plano', zIndex: 250 },
  cierres: { nombre: 'cierres', zIndex: 420 },
  ruta: { nombre: 'ruta', zIndex: 450 },
  marcadores: { nombre: 'marcadores', zIndex: 650 },
} as const

export const ORDEN_PANES = ['plano', 'cierres', 'ruta', 'marcadores'] as const

/**
 * Encuadre inicial: la zona de edificios, de la galería del 1er piso y Labs. A y B (arriba) hasta
 * el Teatro y el Rectorado (abajo), sin las canchas. Ajustado mirando el plano.
 */
export const ENCUADRE_INICIAL: Caja = { x1: 200, y1: 1000, x2: 1850, y2: 3560 }

/**
 * Zooms en escala del plano (`mapa-unlam.svg`, ≈ 0,18 m/px). Con el plano anterior (0,35 m/px)
 * eran un punto más (3, 0,5 y −0,5): se bajaron para mostrar la misma porción del campus.
 */
export const ZOOM_MAXIMO = 2
/** Zoom mínimo al recentrar sobre un lugar (escala ≈ 0,7 × el plano). */
export const ZOOM_LUGAR = -0.5
/** Zoom mínimo al llevar a la vista un lugar que quedó fuera de la franja visible. */
export const ZOOM_ACERCAR = -1.5
/** Margen de `maxBounds` alrededor del plano (10 %). */
export const MARGEN_LIMITES = 0.1
/** Caja del plano entero. */
export function cajaPlano(plano: Pick<PlanoBase, 'ancho' | 'alto'>): Caja {
  return { x1: 0, y1: 0, x2: plano.ancho, y2: plano.alto }
}
