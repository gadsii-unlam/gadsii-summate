/**
 * Dónde va la barra "Sin conexión" (design.md, decisión 4): arriba de la hoja inferior, sin tapar
 * la tarjeta de arriba (barra de búsqueda o panel "Cómo llegar") ni el contenido de la hoja
 * (tarjeta resumen de la ruta). Si no entra entre las dos (hoja expandida), va pegada debajo de
 * la tarjeta, sobre el borde de la hoja.
 */

export const SEPARACION_BARRA = 8
/** Alto de la barra con el botón (objetivo táctil de 44 px más el relleno). */
export const ALTO_BARRA = 52

export interface MedidasPantalla {
  altoVentana: number
  /** Alto visible de la hoja inferior (px desde abajo). */
  altoHoja: number
  /** Borde inferior de la tarjeta de arriba (px desde arriba), con el área segura. */
  bordeTarjeta: number
  altoBarra?: number
}

export interface PosicionBarra {
  /** Distancia desde abajo de la ventana, en px. */
  abajo: number
  /** `true` si no entra entre la tarjeta y la hoja y queda sobre el borde de la hoja. */
  sobreLaHoja: boolean
}

export function posicionBarra(m: MedidasPantalla): PosicionBarra {
  const alto = m.altoBarra ?? ALTO_BARRA
  const abajo = m.altoHoja + SEPARACION_BARRA
  const arriba = m.altoVentana - abajo - alto
  if (arriba >= m.bordeTarjeta + SEPARACION_BARRA) return { abajo, sobreLaHoja: false }
  return {
    abajo: Math.max(0, m.altoVentana - m.bordeTarjeta - SEPARACION_BARRA - alto),
    sobreLaHoja: true,
  }
}
