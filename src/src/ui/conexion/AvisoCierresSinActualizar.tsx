/**
 * "Cierres sin actualizar desde las HH:MM" (decisión 3), para mostrar junto a la ruta cuando hay
 * conexión pero los cierres usados no vinieron de la red (por ejemplo, la red tardó más de 4 s).
 * Con la barra "Sin conexión" visible, el mismo texto va dentro de la barra.
 */
import { textoCierresSinActualizar, type OrigenDatos } from '../../conexion/index.ts'
import './conexion.css'

export interface PropsAvisoCierresSinActualizar {
  origen: OrigenDatos | null | undefined
  zonaHoraria?: string
}

export default function AvisoCierresSinActualizar({
  origen,
  zonaHoraria,
}: PropsAvisoCierresSinActualizar) {
  const texto = textoCierresSinActualizar(origen, zonaHoraria)
  if (!texto) return null
  return (
    <p className="aviso-cierres" role="status">
      {texto}
    </p>
  )
}
