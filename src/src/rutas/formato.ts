/**
 * Formato de números y nombres de la ruta (design.md de mostrar-ruta-e-indicaciones, decisión 7).
 * Puro: lo usan las indicaciones y la hoja de resultado.
 */

/** Paso del redondeo de distancias, en metros. */
export const PASO_REDONDEO_M = 5

/**
 * Redondea al múltiplo de 5 m más cercano, con las mitades hacia arriba y un mínimo de 5 m
 * (163 → 165, 31,4 → 30, 12,6 → 15, 2,9 → 5).
 */
export function redondearDistancia(metros: number): number {
  // El épsilon absorbe errores de coma flotante en las mitades exactas (17,5 → 20).
  const redondeado = Math.floor(metros / PASO_REDONDEO_M + 0.5 + 1e-9) * PASO_REDONDEO_M
  return Math.max(PASO_REDONDEO_M, redondeado)
}

/** "165 m"; desde 1000 m, "1,2 km" (en el campus no ocurre). */
export function textoDistancia(metros: number): string {
  const m = redondearDistancia(metros)
  if (m < 1000) return `${m} m`
  return `${(m / 1000).toLocaleString('es-AR', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} km`
}

/** "2 min" (mínimo "1 min"). */
export function textoTiempo(minutos: number): string {
  return `${Math.max(1, Math.round(minutos))} min`
}

/** "2 min · 165 m". */
export function textoResumen(ruta: { tiempoMin: number; distanciaM: number }): string {
  return `${textoTiempo(ruta.tiempoMin)} · ${textoDistancia(ruta.distanciaM)}`
}

/** "Incluye 60 m al aire libre" si hay algún metro afuera (mínimo 5 m); si no, "Todo bajo techo". */
export function textoAireLibre(exteriorM: number): string {
  if (exteriorM > 0) return `Incluye ${textoDistancia(exteriorM)} al aire libre`
  return 'Todo bajo techo'
}

/** "Ruta encontrada: 2 min, 165 m, incluye 60 m al aire libre" (decisión 14). */
export function textoAnuncioRuta(ruta: {
  tiempoMin: number
  distanciaM: number
  exteriorM: number
}): string {
  const aire = textoAireLibre(ruta.exteriorM)
  return `Ruta encontrada: ${textoTiempo(ruta.tiempoMin)}, ${textoDistancia(ruta.distanciaM)}, ${aire.charAt(0).toLowerCase()}${aire.slice(1)}`
}

export type NombreChip = 'Más rápida' | 'Techada' | 'Más resguardada'

/**
 * Nombre del chip de una ruta: la más corta es "Más rápida"; la resguardada, "Techada" si no tiene
 * metros al aire libre y "Más resguardada" si tiene alguno (no prometer techo que no hay).
 */
export function nombreChip(criterio: 'mas-corta' | 'resguardada', exteriorM: number): NombreChip {
  if (criterio === 'mas-corta') return 'Más rápida'
  return exteriorM > 0 ? 'Más resguardada' : 'Techada'
}

export type NotaRutaUnicaLluvia = 'Ya es techada' | 'Es la opción más resguardada'

/** Por qué hay una sola ruta cuando llueve. */
export function notaRutaUnicaConLluvia(exteriorM: number): NotaRutaUnicaLluvia {
  return exteriorM > 0 ? 'Es la opción más resguardada' : 'Ya es techada'
}
