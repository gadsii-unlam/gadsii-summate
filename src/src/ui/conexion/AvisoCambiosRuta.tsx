/**
 * Avisos de ruta con datos nuevos (decisión 4):
 * - Al reconectar solo, si la ruta cambiaría: "Hay cambios en tu ruta" o "Un tramo de tu ruta
 *   está cerrado", con "Ver ruta actualizada". La ruta en pantalla no cambia hasta tocarlo.
 * - Después de "Reintentar" (o de tocar "Ver ruta actualizada"), si se aplicó una ruta nueva:
 *   "Actualizamos la ruta con los datos nuevos".
 */
import type { CambioRuta } from '../../conexion/index.ts'
import { TEXTOS_CONEXION as T } from './textos.ts'
import './conexion.css'

export interface PropsAvisoCambiosRuta {
  /** Resultado de `compararRutas`. Con `igual` no se muestra nada. */
  cambio: CambioRuta
  onVerRuta: () => void
}

export function AvisoCambiosRuta({ cambio, onVerRuta }: PropsAvisoCambiosRuta) {
  if (cambio === 'igual') return null
  return (
    <div className="aviso-ruta" data-cambio={cambio}>
      <p role="status" className="aviso-ruta__texto">
        {cambio === 'tramo-cerrado' ? T.tramoCerrado : T.hayCambios}
      </p>
      <button type="button" className="boton boton--primario" onClick={onVerRuta}>
        {T.verRutaActualizada}
      </button>
    </div>
  )
}

export interface PropsAvisoRutaActualizada {
  visible: boolean
}

export function AvisoRutaActualizada({ visible }: PropsAvisoRutaActualizada) {
  if (!visible) return null
  return (
    <p className="aviso-ruta aviso-ruta__texto" role="status">
      {T.rutaActualizada}
    </p>
  )
}
