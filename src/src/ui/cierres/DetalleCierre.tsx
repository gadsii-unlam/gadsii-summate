/**
 * Contenido de la burbuja al tocar el ícono de un tramo cerrado (decisión 9): el motivo y, si el
 * cierre tiene fin, "Cerrado hasta el 14/11 a las 23:00".
 */
import { detalleDeCierre, type TramoCerrado } from '../../cierres/index.ts'
import IconoPasoProhibido from './IconoPasoProhibido.tsx'
import './cierres.css'

export interface PropsDetalleCierre {
  tramo: Pick<TramoCerrado, 'motivo' | 'hasta'>
  /** Zona horaria IANA para la fecha de fin. Por defecto la del dispositivo. */
  zonaHoraria?: string
}

export default function DetalleCierre({ tramo, zonaHoraria }: PropsDetalleCierre) {
  const { motivo, hasta } = detalleDeCierre(tramo, zonaHoraria)
  return (
    <div className="cierre__detalle">
      <p className="cierre__titulo">
        <IconoPasoProhibido tamano={18} />
        <span>Tramo cerrado</span>
      </p>
      <p className="cierre__motivo">{motivo}</p>
      {hasta && <p className="cierre__hasta">{hasta}</p>}
    </div>
  )
}
