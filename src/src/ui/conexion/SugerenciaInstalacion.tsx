/**
 * Sugerencia chica de instalación (decisión 8): como mucho una vez, después del segundo
 * recorrido terminado, nunca en el primer uso ni con una ruta en pantalla. El que la monta
 * decide `visible` con `debeSugerirInstalacion` y llama a `marcarSugerenciaMostrada` al cerrarla.
 */
import { TEXTOS_CONEXION as T } from './textos.ts'
import './conexion.css'

export interface PropsSugerenciaInstalacion {
  visible: boolean
  onInstalar: () => void
  onCerrar: () => void
}

export default function SugerenciaInstalacion({
  visible,
  onInstalar,
  onCerrar,
}: PropsSugerenciaInstalacion) {
  if (!visible) return null
  return (
    <div className="aviso-version" role="region" aria-label={T.instalar}>
      <p className="aviso-version__texto">{T.sugerenciaInstalar}</p>
      <div className="aviso-version__acciones">
        <button type="button" className="boton boton--secundario" onClick={onCerrar}>
          {T.ahoraNo}
        </button>
        <button type="button" className="boton boton--primario" onClick={onInstalar}>
          {T.instalar}
        </button>
      </div>
    </div>
  )
}
