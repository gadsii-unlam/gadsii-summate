/** Ficha del lugar en la hoja (design.md, D1 vista 3 y D7). */
import { useEffect, useRef, useState } from 'react'
import type { Lugar } from '../../datos/index.ts'
import { detalleFicha } from '../busqueda/formato.ts'
import { usePantalla } from '../estado/contexto.ts'
import { IconoDirecciones, IconoInfo, IconoSinAcceso } from '../iconos/Iconos.tsx'
import { useIntegraciones } from '../integraciones.ts'
import { TEXTOS } from '../textos.ts'
import { ID_TITULO_HOJA } from './ContenidoInicio.tsx'

function SinAcceso() {
  const [abierta, setAbierta] = useState(false)
  return (
    <div className="estado-acceso">
      <p className="estado-acceso__texto">
        <IconoSinAcceso tamano={18} />
        {TEXTOS.sinAcceso}
        <button
          type="button"
          className="boton-icono boton-icono--chico"
          aria-label={TEXTOS.sinAccesoInfo}
          aria-expanded={abierta}
          onClick={() => setAbierta((a) => !a)}
        >
          <IconoInfo tamano={20} />
        </button>
      </p>
      {abierta && <p className="ayuda-breve">{TEXTOS.sinAccesoExplicacion}</p>}
    </div>
  )
}

export function CabeceraFicha({ lugar }: { lugar: Lugar }) {
  const { despachar } = usePantalla()
  const { estadoAcceso } = useIntegraciones()
  const titulo = useRef<HTMLHeadingElement>(null)

  // Al abrir, el foco va al título: el lector de pantalla lee el nombre del lugar.
  useEffect(() => {
    titulo.current?.focus({ preventScroll: true })
  }, [lugar.id])

  return (
    <div className="ficha">
      <h2 id={ID_TITULO_HOJA} ref={titulo} tabIndex={-1} className="titulo-hoja titulo-ficha">
        {lugar.nombre}
      </h2>
      <p className="ficha__detalle">{detalleFicha(lugar)}</p>
      {estadoAcceso(lugar.id) === 'sin-acceso' && <SinAcceso />}
      <button
        type="button"
        className="boton boton--primario"
        data-foco="como-llegar"
        onClick={() => despachar({ tipo: 'abrir-como-llegar' })}
      >
        <IconoDirecciones tamano={20} />
        {TEXTOS.comoLlegar}
      </button>
    </div>
  )
}

export function CuerpoFicha({ lugar }: { lugar: Lugar }) {
  return (
    <div className="ficha__mas">
      <p>{TEXTOS.puertas(lugar.puertas.length)}</p>
      {lugar.indicacion && <p>{lugar.indicacion}</p>}
    </div>
  )
}
