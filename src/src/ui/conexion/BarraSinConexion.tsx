/**
 * Barra "Sin conexión" con "Reintentar" (design.md, decisión 4): oscura, tipo snackbar, arriba
 * de la hoja inferior. `role="status"` para que el lector de pantalla la anuncie sin mover el
 * foco. Mientras reintenta, el botón muestra un indicador y no se puede tocar dos veces.
 * Debajo puede mostrar "Cierres sin actualizar desde las HH:MM".
 */
import type { CSSProperties } from 'react'
import { textoCierresSinActualizar, type OrigenDatos } from '../../conexion/index.ts'
import { posicionBarra, type MedidasPantalla } from './posicion.ts'
import { TEXTOS_CONEXION as T } from './textos.ts'
import './conexion.css'

export interface PropsBarraSinConexion {
  /** `monitor.estado === 'sin-conexion'`. */
  visible: boolean
  /** Hay un reintento en curso. */
  reintentando: boolean
  /** Vuelve a pedir cierres y clima, sin borrar origen, destino, ruta ni mapa. */
  onReintentar: () => void
  /**
   * Medidas para ubicarse sola sin tapar la tarjeta de arriba ni la hoja (ver `posicionBarra`).
   * Sin medidas va en el flujo (dentro de la pila de avisos de la app, que ya se ubica así).
   */
  medidas?: MedidasPantalla
  /** Origen de los cierres usados: si no es la red, se muestra la hora de la copia. */
  origenCierres?: OrigenDatos | null
  /** Zona horaria IANA de la hora de los cierres (por defecto la del dispositivo). */
  zonaHoraria?: string
}

export default function BarraSinConexion({
  visible,
  reintentando,
  onReintentar,
  medidas,
  origenCierres,
  zonaHoraria,
}: PropsBarraSinConexion) {
  if (!visible) return null
  const posicion = medidas ? posicionBarra(medidas) : null
  const cierres = textoCierresSinActualizar(origenCierres, zonaHoraria)
  return (
    <div
      className={`aviso-conexion${posicion ? '' : ' aviso-conexion--en-pila'}`}
      data-sobre-la-hoja={posicion?.sobreLaHoja || undefined}
      style={posicion ? ({ '--aviso-abajo': `${posicion.abajo}px` } as CSSProperties) : undefined}
    >
      <div role="status" className="aviso-conexion__texto">
        <span className="aviso-conexion__titulo">{T.sinConexion}</span>
        {cierres && <span className="aviso-conexion__detalle">{cierres}</span>}
      </div>
      <button
        type="button"
        className="aviso-conexion__accion"
        onClick={onReintentar}
        disabled={reintentando}
        aria-busy={reintentando || undefined}
      >
        {reintentando && <span className="aviso-conexion__indicador" aria-hidden="true" />}
        {reintentando ? T.reintentando : T.reintentar}
      </button>
    </div>
  )
}
