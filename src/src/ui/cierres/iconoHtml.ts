/**
 * HTML del ícono de paso prohibido para el `divIcon` de Leaflet (círculo rojo con barra blanca),
 * centrado en un objetivo táctil de `TAMANO_TACTIL_ICONO` px (≥ 44 px).
 */
import { ESTILO_TRAMO_CERRADO, TAMANO_TACTIL_ICONO } from '../../cierres/index.ts'

/** Diámetro visible del ícono, en px de pantalla. */
export const DIAMETRO_ICONO = 24

export function svgPasoProhibido(tamano = DIAMETRO_ICONO): string {
  return (
    `<svg aria-hidden="true" focusable="false" width="${tamano}" height="${tamano}" viewBox="0 0 24 24">` +
    `<circle cx="12" cy="12" r="11" fill="${ESTILO_TRAMO_CERRADO.color}" stroke="#FFFFFF" stroke-width="1.5"/>` +
    `<rect x="5.5" y="10" width="13" height="4" rx="1" fill="#FFFFFF"/></svg>`
  )
}

export function htmlIconoCierre(): string {
  return `<span class="cierre__objetivo" style="width:${TAMANO_TACTIL_ICONO}px;height:${TAMANO_TACTIL_ICONO}px">${svgPasoProhibido()}</span>`
}
