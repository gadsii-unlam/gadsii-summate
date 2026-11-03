import type { SimboloLeyenda } from '../ayuda/Ayuda.tsx'
import IconoTramoCerrado from './IconoTramoCerrado.tsx'

export const TEXTO_LEYENDA_CIERRE = 'Tramo cerrado: tocá el ícono para ver el motivo'

/** Símbolos que los cierres agregan a la leyenda de la ayuda. */
export const SIMBOLOS_CIERRES: SimboloLeyenda[] = [
  { Icono: IconoTramoCerrado, texto: TEXTO_LEYENDA_CIERRE },
]
