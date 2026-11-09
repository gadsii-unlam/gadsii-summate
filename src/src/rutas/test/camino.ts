import type { GrafoCampus, NodoCampus, TipoNodo } from '../../datos/index.ts'
import { calcularRuta } from '../astar.ts'
import { prepararGrafoRuteable } from '../grafo-ruteable.ts'
import { prepararDatosIndicaciones, type NombresEntradas } from '../indicaciones.ts'
import type { RutaEncontrada } from '../tipos.ts'

/** Un punto de un camino de prueba: id, coordenadas y (opcional) tipo, departamento y piso. */
export interface PuntoCamino {
  id: string
  x: number
  y: number
  tipo?: TipoNodo
  depto?: string
  piso?: number
}

/**
 * Grafo de prueba con un solo camino (cada punto unido al siguiente), a 1 m por px. `exteriores`
 * son los índices de las aristas al aire libre (la arista `i` une el punto `i` con el `i + 1`).
 */
export function camino(
  puntos: readonly PuntoCamino[],
  exteriores: readonly number[] = [],
  entradas: NombresEntradas = {},
) {
  const nodos: NodoCampus[] = puntos.map((p) => ({
    id: p.id,
    tipo: p.tipo ?? (p.id.split('-')[0] as TipoNodo),
    depto: p.depto ?? 'edificio-sur',
    x: p.x,
    y: p.y,
    piso: p.piso ?? 0,
  }))
  const aristas = nodos.slice(1).map((b, i) => {
    const a = nodos[i]!
    const px = Math.round(Math.hypot(a.x - b.x, a.y - b.y) * 100) / 100
    return {
      id: `arista__${a.id}__${b.id}`,
      a: a.id,
      b: b.id,
      px,
      m: px,
      exterior: exteriores.includes(i),
    }
  })
  const campus: GrafoCampus = {
    version: 'prueba',
    metrosPorPx: 1,
    ancho: 2000,
    alto: 2000,
    nodos,
    aristas,
  }
  const grafo = prepararGrafoRuteable(campus)
  const r = calcularRuta(grafo, {
    origen: [nodos[0]!.id],
    destino: [nodos[nodos.length - 1]!.id],
    criterio: 'mas-corta',
  })
  if (r.tipo !== 'ruta') throw new Error(`camino de prueba sin ruta: ${r.tipo}`)
  const datos = prepararDatosIndicaciones({ grafo, nodos, entradas })
  return { campus, grafo, ruta: r as RutaEncontrada, datos }
}
