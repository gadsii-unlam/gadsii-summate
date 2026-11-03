/** Chips de alternativas (decisión 7): la recomendada primero, `aria-pressed` en la elegida. */
import type { Criterio } from '../../rutas/index.ts'
import type { OpcionRuta } from './modelo.ts'
import { TEXTOS_RUTA } from './textos.ts'
import './ruta.css'

export interface PropsChipsAlternativas {
  opciones: readonly OpcionRuta[]
  elegida: Criterio
  alElegir: (criterio: Criterio) => void
}

export default function ChipsAlternativas({ opciones, elegida, alElegir }: PropsChipsAlternativas) {
  if (opciones.length < 2) return null
  return (
    <ul className="ruta-chips" aria-label={TEXTOS_RUTA.alternativas}>
      {opciones.map((o) => (
        <li key={o.criterio}>
          <button
            type="button"
            className="ruta-chip"
            aria-pressed={o.criterio === elegida}
            onClick={() => alElegir(o.criterio)}
          >
            <span>{o.etiqueta}</span>
            {o.detalle && <span className="ruta-chip__detalle">{o.detalle}</span>}
            {o.subtitulo && <span className="ruta-chip__subtitulo">{o.subtitulo}</span>}
          </button>
        </li>
      ))}
    </ul>
  )
}
