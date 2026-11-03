import type { GrafoRuteable } from '../tipos.ts'

/**
 * Dijkstra de referencia, solo para tests: búsqueda exhaustiva desde un nodo, sin heurística, sin
 * heap (busca el mínimo linealmente) y con el costo como par `(primario, secundario)` comparado
 * lexicográficamente. Así no comparte nada con A* salvo el grafo.
 *
 * - `distancia`: costo simple, solo la longitud (el secundario es 0).
 * - `distancia-exterior`: (longitud total, longitud exterior), el orden de `mas-corta`.
 * - `exterior-distancia`: (longitud exterior, longitud total), el orden de `resguardada`.
 */
export type OrdenReferencia = 'distancia' | 'distancia-exterior' | 'exterior-distancia'

export interface DistanciasReferencia {
  /** Longitud total en centésimas de px del camino óptimo hasta cada nodo (Infinity si no se llega). */
  distancia: Float64Array
  /** Longitud exterior en centésimas de px de ese mismo camino. */
  exterior: Float64Array
}

export function dijkstraReferencia(
  grafo: GrafoRuteable,
  origen: number,
  orden: OrdenReferencia,
): DistanciasReferencia {
  const n = grafo.nodos.length
  const distancia = new Float64Array(n).fill(Infinity)
  const exterior = new Float64Array(n).fill(Infinity)
  const listo = new Uint8Array(n)
  const clave = (i: number): [number, number] => {
    if (orden === 'distancia') return [distancia[i]!, 0]
    if (orden === 'distancia-exterior') return [distancia[i]!, exterior[i]!]
    return [exterior[i]!, distancia[i]!]
  }
  const menor = (a: [number, number], b: [number, number]) =>
    a[0] < b[0] || (a[0] === b[0] && a[1] < b[1])

  distancia[origen] = 0
  exterior[origen] = 0
  for (;;) {
    let u = -1
    for (let i = 0; i < n; i++) {
      if (listo[i] === 0 && distancia[i] !== Infinity && (u === -1 || menor(clave(i), clave(u))))
        u = i
    }
    if (u === -1) break
    listo[u] = 1
    for (const { nodo: v, arista } of grafo.nodos[u]!.vecinos) {
      if (listo[v] === 1) continue
      const a = grafo.aristas[arista]!
      const dv = distancia[u]! + a.longitud
      const ev = exterior[u]! + (a.exterior ? a.longitud : 0)
      const nueva: [number, number] =
        orden === 'distancia' ? [dv, 0] : orden === 'distancia-exterior' ? [dv, ev] : [ev, dv]
      if (distancia[v] === Infinity || menor(nueva, clave(v))) {
        distancia[v] = dv
        exterior[v] = ev
      }
    }
  }
  return { distancia, exterior }
}
