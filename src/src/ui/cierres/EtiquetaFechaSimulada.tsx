/**
 * Etiqueta visible "Fecha simulada: 05/11 10:00" mientras `?ahora=` reemplaza el reloj
 * (decisión 3), para que nunca quede activa por error en la prueba con usuarios.
 */
import { textoFechaSimulada } from '../../cierres/index.ts'
import './cierres.css'

export interface PropsEtiquetaFechaSimulada {
  /** Fecha simulada en ms (`leerFechaSimulada()`), o `null` si se usa el reloj real. */
  fecha: number | null
  /** Zona horaria IANA. Por defecto la del dispositivo. */
  zonaHoraria?: string
}

export default function EtiquetaFechaSimulada({ fecha, zonaHoraria }: PropsEtiquetaFechaSimulada) {
  if (fecha === null) return null
  return (
    <p className="cierre__fecha-simulada" role="status">
      {textoFechaSimulada(fecha, zonaHoraria)}
    </p>
  )
}
