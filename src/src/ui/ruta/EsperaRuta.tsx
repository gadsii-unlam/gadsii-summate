/** "Buscando el camino…" con barra indeterminada (decisión 6). */
import { TEXTOS_RUTA } from './textos.ts'
import './ruta.css'

export interface PropsEsperaRuta {
  origen: string
  destino: string
}

export default function EsperaRuta({ origen, destino }: PropsEsperaRuta) {
  return (
    <div className="ruta-espera" data-testid="ruta-espera">
      <div
        className="ruta-espera__barra"
        role="progressbar"
        aria-label={TEXTOS_RUTA.buscandoProgreso}
      />
      <p className="ruta-espera__titulo">{TEXTOS_RUTA.buscando}</p>
      <p className="ruta-espera__trayecto">{TEXTOS_RUTA.trayecto(origen, destino)}</p>
    </div>
  )
}
