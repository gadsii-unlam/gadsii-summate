/**
 * Vigencia de los cierres (decisión 3): `desde ≤ ahora < hasta`. Un cierre con una fecha
 * inválida (`siempreVigente`) se aplica siempre.
 */
import type { TramosExcluidos } from '../rutas/index.ts'
import type { Cierre } from './tipos.ts'

export function estaVigente(cierre: Cierre, ahora: number): boolean {
  if (cierre.siempreVigente) return true
  if (cierre.desde !== null && ahora < cierre.desde) return false
  if (cierre.hasta !== null && ahora >= cierre.hasta) return false
  return true
}

/** Cierres vigentes en `ahora` (ms desde epoch), en el orden del archivo. */
export function cierresVigentes(cierres: readonly Cierre[], ahora: number): Cierre[] {
  return cierres.filter((c) => estaVigente(c, ahora))
}

/** Une los nodos y aristas de una lista de cierres en el formato `excluidos` del motor. */
export function tramosDeCierres(cierres: readonly Cierre[]): TramosExcluidos {
  const nodos = new Set<string>()
  const aristas = new Set<string>()
  for (const c of cierres) {
    for (const n of c.nodos) nodos.add(n)
    for (const a of c.aristas) aristas.add(a)
  }
  return { nodos, aristas }
}

/**
 * Tramos excluidos vigentes en `ahora`: lo que hay que pasar como `excluidos` a `calcularRuta`
 * en todo cálculo, con cualquier criterio y cualquier clima.
 */
export function obtenerTramosExcluidos(cierres: readonly Cierre[], ahora: number): TramosExcluidos {
  return tramosDeCierres(cierresVigentes(cierres, ahora))
}
