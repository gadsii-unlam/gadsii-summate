/**
 * Anclaje de la hoja inferior (design.md, D2). Lógica pura, sin DOM.
 *
 * Las posiciones son altos visibles de la hoja en px (0 = abajo de todo). La velocidad está en
 * px/ms y es positiva hacia arriba (la hoja crece).
 */

export const ALTURAS = ['colapsada', 'media', 'expandida'] as const
export type Altura = (typeof ALTURAS)[number]

/** Tiempo de proyección de la posición al soltar. */
export const PROYECCION_MS = 200
/** Desde esta velocidad, el deslizamiento avanza una altura en esa dirección. */
export const UMBRAL_RAPIDO = 0.5

export type Anclajes = Record<Altura, number>

function masCercana(posicion: number, anclajes: Anclajes): Altura {
  let mejor: Altura = 'colapsada'
  for (const a of ALTURAS) {
    if (Math.abs(anclajes[a] - posicion) < Math.abs(anclajes[mejor] - posicion)) mejor = a
  }
  return mejor
}

/**
 * Elige la altura donde se ancla la hoja al soltarla: la más cercana a `posición + velocidad ×
 * 200 ms`. Un deslizamiento rápido (más de 0,5 px/ms) avanza al menos una altura en esa dirección
 * aunque el dedo no haya llegado a la mitad.
 */
export function elegirAnclaje(posicion: number, velocidad: number, anclajes: Anclajes): Altura {
  const proyectada = posicion + velocidad * PROYECCION_MS
  const porProyeccion = masCercana(proyectada, anclajes)
  if (Math.abs(velocidad) <= UMBRAL_RAPIDO) return porProyeccion

  const orden = [...ALTURAS].sort((a, b) => anclajes[a] - anclajes[b])
  if (velocidad > 0) {
    const siguiente = orden.find((a) => anclajes[a] > posicion + 1) ?? orden[orden.length - 1]
    return siguiente && anclajes[siguiente] > anclajes[porProyeccion] ? siguiente : porProyeccion
  }
  const anterior = [...orden].reverse().find((a) => anclajes[a] < posicion - 1) ?? orden[0]
  return anterior && anclajes[anterior] < anclajes[porProyeccion] ? anterior : porProyeccion
}

/** Altura siguiente para el teclado (`Enter`/`Espacio` dan la vuelta). */
export function alturaSiguiente(actual: Altura, sentido: 1 | -1, circular = false): Altura {
  const i = ALTURAS.indexOf(actual) + sentido
  if (circular) return ALTURAS[(i + ALTURAS.length) % ALTURAS.length] ?? actual
  return ALTURAS[Math.min(Math.max(i, 0), ALTURAS.length - 1)] ?? actual
}

/**
 * Altos de cada anclaje para un viewport dado (D2). Con `altoContenido` (el alto que necesita lo
 * que muestra la hoja), la altura media no pasa de ese alto: un contenido corto, como el resumen
 * de la ruta, no deja un hueco blanco abajo.
 */
export function calcularAnclajes(
  altoVentana: number,
  altoTarjeta: number,
  seguroArriba: number,
  seguroAbajo: number,
  altoContenido?: number,
): Anclajes {
  const colapsada = 96 + seguroAbajo
  const expandida = Math.max(
    colapsada + 2,
    Math.round(altoVentana - (altoTarjeta + seguroArriba + 16)),
  )
  const mitad = Math.round(altoVentana * 0.5)
  const deseada = altoContenido && altoContenido > 0 ? Math.min(mitad, altoContenido) : mitad
  const media = Math.min(Math.max(deseada, colapsada + 1), expandida - 1)
  return { colapsada, media, expandida }
}
