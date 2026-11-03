/**
 * Sistema de coordenadas del plano (design.md, D4): `CRS.Simple` con la y hacia abajo, como en
 * Figma. Un `LatLng` es `[y, x]` en px de `mapa-unlam`, así los nodos de `grafo.json` y las cajas
 * del catálogo se ubican sin convertir. Zoom `z` = escala `2^z`.
 */
import L from 'leaflet'
import type { Caja } from '../../datos/index.ts'

export const CRS_PLANO: L.CRS = L.extend({}, L.CRS.Simple, {
  transformation: new L.Transformation(1, 0, 1, 0),
})

export interface PuntoPlano {
  x: number
  y: number
}

/** Única conversión de px del plano a `LatLng`. */
export function aLatLng({ x, y }: PuntoPlano): L.LatLng {
  return L.latLng(y, x)
}

export function aLatLngBounds(caja: Caja): L.LatLngBounds {
  return L.latLngBounds(aLatLng({ x: caja.x1, y: caja.y1 }), aLatLng({ x: caja.x2, y: caja.y2 }))
}
