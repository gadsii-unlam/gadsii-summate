import type { GrafoRuteable } from './tipos.ts'

/**
 * Heurística de A* (decisión 2): distancia euclídea, en centésimas de px enteras redondeadas hacia
 * abajo, desde el nodo hasta la puerta destino más cercana. Es admisible y consistente porque
 * ninguna arista mide menos que la distancia euclídea entre sus extremos (las rectas miden
 * exactamente eso y las diagonales se redondean hacia arriba). Ver `src/rutas/README.md`.
 */
export function crearHeuristica(
  grafo: GrafoRuteable,
  destinos: readonly number[],
): (nodo: number) => number {
  const xs = destinos.map((d) => grafo.nodos[d]!.cx)
  const ys = destinos.map((d) => grafo.nodos[d]!.cy)
  return (nodo) => {
    const { cx, cy } = grafo.nodos[nodo]!
    let minimo = Infinity
    for (let i = 0; i < xs.length; i++) {
      const d = Math.floor(Math.hypot(cx - xs[i]!, cy - ys[i]!))
      if (d < minimo) minimo = d
    }
    return minimo
  }
}
