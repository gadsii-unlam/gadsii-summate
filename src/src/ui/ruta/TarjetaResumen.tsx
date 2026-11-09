/** Tarjeta resumen: "2 min · 165 m" e "Incluye 60 m al aire libre" o "Todo bajo techo". */
import { textoAireLibre, textoResumen, type RutaEncontrada } from '../../rutas/index.ts'
import { IconoParaguas } from './iconos.tsx'
import './ruta.css'

export interface PropsTarjetaResumen {
  ruta: Pick<RutaEncontrada, 'tiempoMin' | 'distanciaM' | 'exteriorM'>
  /** Con lluvia, los metros al aire libre llevan un paraguas. */
  llueve?: boolean
  /** Línea extra para la ruta única con lluvia ("Ya es techada"). */
  nota?: string | null
}

export default function TarjetaResumen({ ruta, llueve = false, nota = null }: PropsTarjetaResumen) {
  return (
    <div className="ruta-resultado__tarjeta" data-testid="ruta-resumen">
      <p className="ruta-resultado__resumen">{textoResumen(ruta)}</p>
      <p className="ruta-resultado__aire">
        {llueve && ruta.exteriorM > 0 && <IconoParaguas tamano={18} />}
        {textoAireLibre(ruta.exteriorM)}
      </p>
      {nota && <p className="ruta-resultado__nota">{nota}</p>}
    </div>
  )
}
