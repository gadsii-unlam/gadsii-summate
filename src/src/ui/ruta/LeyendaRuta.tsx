/** Leyenda "Bajo techo / Al aire libre" (decisión 3): solo si la ruta tiene tramos al aire libre. */
import { ESTILO_RUTA } from './estilo.ts'
import { TEXTOS_RUTA } from './textos.ts'
import './ruta.css'

export interface PropsLeyendaRuta {
  /** Si es `false`, la leyenda no se muestra. */
  tieneAireLibre: boolean
  /** Distancia desde arriba (debajo de la tarjeta superior), en px. */
  arriba?: number
}

function Muestra({ aireLibre }: { aireLibre: boolean }) {
  return (
    <svg aria-hidden="true" width="28" height="10" viewBox="0 0 28 10" focusable="false">
      <line
        x1="5"
        y1="5"
        x2="23"
        y2="5"
        stroke={ESTILO_RUTA.borde}
        strokeWidth="7"
        strokeLinecap="round"
      />
      <line
        x1="5"
        y1="5"
        x2="23"
        y2="5"
        stroke={aireLibre ? ESTILO_RUTA.rellenoAireLibre : ESTILO_RUTA.relleno}
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}

export default function LeyendaRuta({ tieneAireLibre, arriba = 16 }: PropsLeyendaRuta) {
  if (!tieneAireLibre) return null
  return (
    <ul className="ruta-leyenda" aria-label={TEXTOS_RUTA.leyenda} style={{ top: arriba }}>
      <li>
        <Muestra aireLibre={false} />
        {TEXTOS_RUTA.bajoTecho}
      </li>
      <li>
        <Muestra aireLibre />
        {TEXTOS_RUTA.alAireLibre}
      </li>
    </ul>
  )
}
