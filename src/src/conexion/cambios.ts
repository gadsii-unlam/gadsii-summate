/**
 * Qué cambió en la ruta con los datos nuevos (design.md de tolerar-senal-irregular, decisión 4).
 * Al reconectar, la ruta en pantalla no se reemplaza sola: si cambiaría, se ofrece verla con
 * "Hay cambios en tu ruta" o, si la ruta mostrada pasa por un tramo ahora cerrado,
 * "Un tramo de tu ruta está cerrado".
 */

export type CambioRuta = 'igual' | 'cambios' | 'tramo-cerrado'

export interface RutaComparable {
  nodos: readonly string[]
  aristas?: readonly string[]
}

export interface TramosCerrados {
  nodos?: ReadonlySet<string>
  aristas?: ReadonlySet<string>
}

const iguales = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((x, i) => x === b[i])

/**
 * Compara la ruta mostrada con la que saldría con los datos nuevos. `nueva` es `null` si con los
 * datos nuevos no hay ruta. `cerrados` son los tramos excluidos por los cierres nuevos.
 */
export function compararRutas(
  mostrada: RutaComparable,
  nueva: RutaComparable | null,
  cerrados: TramosCerrados = {},
): CambioRuta {
  const pasaPorCerrado =
    mostrada.nodos.some((n) => cerrados.nodos?.has(n)) ||
    (mostrada.aristas ?? []).some((a) => cerrados.aristas?.has(a))
  if (pasaPorCerrado) return 'tramo-cerrado'
  if (!nueva) return 'cambios'
  return iguales(mostrada.nodos, nueva.nodos) ? 'igual' : 'cambios'
}
