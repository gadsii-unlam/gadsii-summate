/** Catálogo de lugares preparado para la interfaz (índice de búsqueda, referencias y entradas). */
import { createContext, useContext } from 'react'
import { compararNombres, crearIndice } from '../busqueda/index.ts'
import type { IndiceLugares } from '../busqueda/index.ts'
import type { CatalogoLugares, Lugar, NodoCampus } from '../datos/index.ts'

export interface Punto {
  x: number
  y: number
}

export interface CatalogoUI {
  lugares: Lugar[]
  porId: ReadonlyMap<string, Lugar>
  indice: IndiceLugares
  /** Las entradas al campus, con la principal primero. */
  entradas: Lugar[]
  /** Referencias reconocibles que no son entradas (Biblioteca, Buffet…), en el orden de D6. */
  referencias: Lugar[]
  /** Posición de la puerta principal (o el centro de la caja mientras no cargó el grafo). */
  ubicar: (lugar: Lugar) => Punto
}

const ORDEN_REFERENCIAS = [
  'biblioteca',
  'buffet',
  'salon-americas',
  'teatro',
  'gimnasio',
  'rectorado',
]

const ORDEN_ENTRADAS = ['entrada-campus-florencio-varela']

function ordenarPor(preferidos: string[]) {
  return (a: Lugar, b: Lugar) => {
    const ia = preferidos.indexOf(a.id)
    const ib = preferidos.indexOf(b.id)
    if (ia >= 0 || ib >= 0) return (ia < 0 ? Infinity : ia) - (ib < 0 ? Infinity : ib)
    return compararNombres(a, b)
  }
}

export function crearCatalogoUI(
  catalogo: CatalogoLugares,
  nodos: readonly NodoCampus[] | null = null,
): CatalogoUI {
  const lugares = catalogo.lugares
  const porId = new Map(lugares.map((l) => [l.id, l]))
  const posiciones = new Map((nodos ?? []).map((n) => [n.id, { x: n.x, y: n.y }]))
  return {
    lugares,
    porId,
    indice: crearIndice(lugares),
    entradas: lugares.filter((l) => l.categoria === 'entrada').sort(ordenarPor(ORDEN_ENTRADAS)),
    referencias: lugares
      .filter((l) => l.referencia && l.categoria !== 'entrada')
      .sort(ordenarPor(ORDEN_REFERENCIAS)),
    ubicar(lugar) {
      const puerta = lugar.puertas[0]
      const p = puerta ? posiciones.get(puerta) : undefined
      if (p) return p
      return { x: (lugar.caja.x1 + lugar.caja.x2) / 2, y: (lugar.caja.y1 + lugar.caja.y2) / 2 }
    },
  }
}

export const ContextoCatalogo = createContext<CatalogoUI | null>(null)

export function useCatalogo(): CatalogoUI {
  const valor = useContext(ContextoCatalogo)
  if (!valor) throw new Error('useCatalogo fuera de <Pantalla>')
  return valor
}

/** Lugar por id (o `null` si el id es nulo o ya no existe). */
export function useLugar(id: string | null): Lugar | null {
  const { porId } = useCatalogo()
  return id ? (porId.get(id) ?? null) : null
}
