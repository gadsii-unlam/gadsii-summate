/**
 * Cómo se dibujan las líneas sobre el plano (ruta, alternativa, paso resaltado y cierres).
 *
 * Leaflet dibuja los vectores en un lienzo del tamaño de la pantalla más un margen y solo lo
 * actualiza al terminar cada movimiento. Con Canvas (o con el SVG por defecto, que recorta las
 * líneas a ese lienzo), al arrastrar lo que entra desde afuera del margen recién aparece al
 * soltar: la ruta se ve "de a pedacitos". Por eso:
 * - SVG con `overflow: visible` (`mapa.css`) y `noClip` en cada línea: la línea entera queda
 *   dibujada aunque salga del lienzo, así que al arrastrar ya está ahí. Son pocos puntos y el
 *   navegador los dibuja como vector, sin el costo de memoria de un Canvas grande.
 * - Margen de una pantalla a cada lado: Leaflet saltea las líneas que al terminar un movimiento
 *   quedan enteras fuera del lienzo; con el margen, eso solo pasa lejos de la vista.
 */
import L from 'leaflet'

/** Margen del lienzo de vectores, en pantallas a cada lado (Leaflet usa 0,1 por defecto). */
export const MARGEN_VECTORES = 1

export function rendererVectorial(pane: string): L.Renderer {
  return L.svg({ pane, padding: MARGEN_VECTORES })
}

/**
 * Opciones de creación de toda línea sobre el plano: sin recortar al lienzo. Van como props de
 * `<Polyline>`, no en `pathOptions` (react-leaflet las aplica después de agregar la línea).
 */
export const SIN_RECORTE: L.PolylineOptions = { noClip: true }
