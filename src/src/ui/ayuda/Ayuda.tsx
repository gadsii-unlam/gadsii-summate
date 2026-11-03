/** Hoja de ayuda (design.md, D9): tres pasos, leyenda de símbolos, ubicación y crédito. */
import { useEffect, useRef } from 'react'
import type { ComponentType, ReactNode } from 'react'
import { usePantalla } from '../estado/contexto.ts'
import { IconoCerrar, IconoLineaRuta, IconoOrigen, IconoPin } from '../iconos/Iconos.tsx'
import type { PropsIcono } from '../iconos/Iconos.tsx'
import { TEXTOS } from '../textos.ts'
import './ayuda.css'

/** Símbolo extra de la leyenda (tramo al aire libre, tramo cerrado…), para los cambios 4 y 7. */
export interface SimboloLeyenda {
  Icono: ComponentType<PropsIcono>
  texto: string
}

export default function Ayuda({
  simbolosExtra = [],
  extra = null,
}: {
  simbolosExtra?: SimboloLeyenda[]
  /** Contenido extra al final (tolerar-senal-irregular: instalar en el celular). */
  extra?: ReactNode
}) {
  const { volver } = usePantalla()
  const titulo = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    titulo.current?.focus()
  }, [])

  const leyenda: SimboloLeyenda[] = [
    { Icono: IconoOrigen, texto: TEXTOS.leyendaOrigen },
    { Icono: IconoPin, texto: TEXTOS.leyendaDestino },
    { Icono: IconoLineaRuta, texto: TEXTOS.leyendaRuta },
    ...simbolosExtra,
  ]

  return (
    <div className="ayuda" role="dialog" aria-modal="true" aria-labelledby="ayuda-titulo">
      <div className="ayuda__cabecera">
        <h2 id="ayuda-titulo" ref={titulo} tabIndex={-1}>
          {TEXTOS.ayudaTitulo}
        </h2>
        <button
          type="button"
          className="boton-icono"
          aria-label={TEXTOS.cerrarAyuda}
          onClick={volver}
        >
          <IconoCerrar />
        </button>
      </div>
      <div className="ayuda__cuerpo">
        <ol className="ayuda__pasos">
          {TEXTOS.ayudaPasos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ol>
        <h3 className="titulo-seccion">{TEXTOS.leyendaTitulo}</h3>
        <ul className="ayuda__leyenda">
          {leyenda.map(({ Icono, texto }) => (
            <li key={texto}>
              <Icono tamano={28} />
              <span>{texto}</span>
            </li>
          ))}
        </ul>
        <p className="ayuda__ubicacion">{TEXTOS.ayudaUbicacion}</p>
        {extra}
        <p className="ayuda-breve">{TEXTOS.creditoPlano}</p>
      </div>
    </div>
  )
}
