/**
 * Fila de un lugar: ícono de categoría, nombre (con la coincidencia en negrita) y, debajo,
 * "Edificio · Categoría". El nombre y el edificio salen tal cual del catálogo (hallazgo 12).
 */
import type { Lugar } from '../../datos/index.ts'
import {
  IconoCategoria,
  IconoReciente,
  IconoReferencia,
  IconoSinAcceso,
} from '../iconos/Iconos.tsx'
import { TEXTOS } from '../textos.ts'
import { detalleLugar, resaltar } from './formato.ts'

export type TipoFila = 'resultado' | 'reciente' | 'referencia' | 'sugerencia'

function Icono({ tipo, lugar }: { tipo: TipoFila; lugar: Lugar }) {
  if (tipo === 'reciente') return <IconoReciente />
  if (tipo === 'referencia' || tipo === 'sugerencia') return <IconoReferencia />
  return <IconoCategoria categoria={lugar.categoria} />
}

export interface PropsContenidoFila {
  lugar: Lugar
  tipo: TipoFila
  resaltado?: ReadonlyArray<readonly [number, number]>
  sinAcceso: boolean
  /** Ids para `aria-describedby` (si la fila es una opción de la búsqueda). */
  idDetalle?: string
  idEstado?: string
}

/** Contenido de una fila (lo usan las opciones de la búsqueda y los botones de la hoja). */
export function ContenidoFila({
  lugar,
  tipo,
  resaltado = [],
  sinAcceso,
  idDetalle,
  idEstado,
}: PropsContenidoFila) {
  return (
    <>
      <span className="fila__icono">
        <Icono tipo={tipo} lugar={lugar} />
      </span>
      <span className="fila__textos">
        <span className="fila__nombre">
          {tipo === 'sugerencia'
            ? TEXTOS.sugerenciaFila(lugar.nombre)
            : resaltar(lugar.nombre, resaltado)}
        </span>
        <span className="fila__detalle" id={idDetalle}>
          {tipo === 'sugerencia' ? TEXTOS.ultimoOrigen : detalleLugar(lugar)}
        </span>
      </span>
      {sinAcceso && (
        <span className="fila__estado" id={idEstado}>
          <IconoSinAcceso tamano={18} />
          {TEXTOS.sinAcceso}
        </span>
      )}
    </>
  )
}

export interface PropsBotonLugar {
  lugar: Lugar
  tipo: TipoFila
  sinAcceso: boolean
  onElegir: (lugar: Lugar) => void
}

/** Fila tocable de la hoja inferior (recientes, referencias). */
export function BotonLugar({ lugar, tipo, sinAcceso, onElegir }: PropsBotonLugar) {
  return (
    <li>
      <button type="button" className="fila" onClick={() => onElegir(lugar)}>
        <ContenidoFila lugar={lugar} tipo={tipo} sinAcceso={sinAcceso} />
      </button>
    </li>
  )
}
