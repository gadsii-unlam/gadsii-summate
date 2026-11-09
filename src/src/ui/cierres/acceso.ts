/** Adaptador del estado de cierres al punto de integración `estadoAcceso` de la interfaz. */
import type { EstadoCierres } from '../../cierres/index.ts'
import type { EstadoAccesoFn } from '../integraciones.ts'

/** `'sin-acceso'` para los lugares sin acceso ahora; `'accesible'` para el resto (o sin estado). */
export function estadoAccesoDe(estado: EstadoCierres | null): EstadoAccesoFn {
  return (lugarId) => (estado?.sinAcceso.has(lugarId) ? 'sin-acceso' : 'accesible')
}
