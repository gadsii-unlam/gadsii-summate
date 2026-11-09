/**
 * "Sin acceso ahora" (decisión 6): un lugar no tiene acceso cuando ninguna de sus puertas
 * abiertas se alcanza desde ninguna entrada al campus abierta. Recorrido en anchura sobre el
 * grafo sin los tramos excluidos, desde todas las entradas a la vez: O(nodos + aristas).
 */
import type { Lugar } from '../datos/index.ts'
import type { GrafoRuteable, TramosExcluidos } from '../rutas/index.ts'

export const ENTRADAS_CAMPUS = [
  'entrada-campus-florencio-varela',
  'entrada-campus-la-paz',
  'entrada-campus-peron-norte',
  'entrada-campus-peron-sur',
] as const

export const TEXTO_SIN_ACCESO = 'Sin acceso ahora'

/** Máscaras de nodos y aristas bloqueados, por índice. */
export interface Bloqueos {
  nodo: Uint8Array
  arista: Uint8Array
}

export function bloqueosDe(grafo: GrafoRuteable, excluidos: TramosExcluidos): Bloqueos {
  const nodo = new Uint8Array(grafo.nodos.length)
  const arista = new Uint8Array(grafo.aristas.length)
  for (const id of excluidos.nodos) {
    const i = grafo.indiceNodo.get(id)
    if (i !== undefined) nodo[i] = 1
  }
  for (const id of excluidos.aristas) {
    const i = grafo.indiceArista.get(id)
    if (i !== undefined) arista[i] = 1
  }
  return { nodo, arista }
}

/**
 * Índices de los nodos alcanzables desde `inicios` (ids) sin pasar por tramos bloqueados. Los
 * inicios bloqueados o desconocidos no cuentan.
 */
export function zonaAlcanzable(
  grafo: GrafoRuteable,
  bloqueos: Bloqueos,
  inicios: readonly string[],
): Set<number> {
  const visitados = new Set<number>()
  const cola: number[] = []
  for (const id of inicios) {
    const i = grafo.indiceNodo.get(id)
    if (i === undefined || bloqueos.nodo[i] || visitados.has(i)) continue
    visitados.add(i)
    cola.push(i)
  }
  for (let k = 0; k < cola.length; k++) {
    for (const v of grafo.nodos[cola[k]!]!.vecinos) {
      if (bloqueos.arista[v.arista] || bloqueos.nodo[v.nodo] || visitados.has(v.nodo)) continue
      visitados.add(v.nodo)
      cola.push(v.nodo)
    }
  }
  return visitados
}

/** Ids de los nodos alcanzables desde alguna entrada al campus abierta. */
export function nodosAlcanzables(grafo: GrafoRuteable, excluidos: TramosExcluidos): Set<string> {
  const zona = zonaAlcanzable(grafo, bloqueosDe(grafo, excluidos), ENTRADAS_CAMPUS)
  return new Set([...zona].map((i) => grafo.nodos[i]!.id))
}

/** `true` si ninguna puerta abierta de `puertas` está en `alcanzables`. */
export function puertasSinAcceso(
  puertas: readonly string[],
  alcanzables: ReadonlySet<string>,
  excluidos: TramosExcluidos,
): boolean {
  return !puertas.some((p) => !excluidos.nodos.has(p) && alcanzables.has(p))
}

/** Ids de los lugares sin acceso ahora. */
export function lugaresSinAcceso(
  grafo: GrafoRuteable,
  lugares: readonly Pick<Lugar, 'id' | 'puertas'>[],
  excluidos: TramosExcluidos,
): Set<string> {
  const alcanzables = nodosAlcanzables(grafo, excluidos)
  const sin = new Set<string>()
  for (const l of lugares) if (puertasSinAcceso(l.puertas, alcanzables, excluidos)) sin.add(l.id)
  return sin
}

export interface EstadoAcceso {
  sinAcceso: boolean
  /** "Sin acceso ahora" o `null` (nunca un guion: brief v4, hallazgo 9). */
  etiqueta: typeof TEXTO_SIN_ACCESO | null
}

/** Estado de acceso de un lugar para la lista de `busqueda-de-lugares`. */
export function estadoAcceso(lugarId: string, sinAcceso: ReadonlySet<string>): EstadoAcceso {
  const sin = sinAcceso.has(lugarId)
  return { sinAcceso: sin, etiqueta: sin ? TEXTO_SIN_ACCESO : null }
}
