import type { AristaCampus, GrafoCampus } from '../datos/index.ts'
import type {
  AristaRuteable,
  GrafoRuteable,
  NodoRuteable,
  PuntoMapa,
  VecinoRuteable,
} from './tipos.ts'

/**
 * Factor que separa las dos componentes del costo lexicográfico (decisiones 4 y 5).
 * Tiene que superar la longitud total del grafo en centésimas de px; se verifica al cargar.
 */
export const K_COSTO = 10_000_000

/** Diferencia máxima admitida entre el `px` del JSON y la longitud recalculada (decisión 3). */
export const TOLERANCIA_PESO_PX = 0.06

/** Una arista puede traer, en el futuro, puntos intermedios (de `a` hacia `b`) si dobla. */
export type AristaConPuntos = AristaCampus & { puntos?: readonly { x: number; y: number }[] }

export interface OpcionesPreparacion {
  /** Conversión px → m. Por defecto, la del grafo (`grafo.metrosPorPx`, igual a `METROS_POR_PX`). */
  metrosPorPx?: number
}

/** Error de datos al preparar el grafo. `problemas` trae un texto por problema, con el id afectado. */
export class ErrorGrafoRuteable extends Error {
  readonly problemas: readonly string[]
  /** Ids de las aristas con problemas (vacío si el problema es de nodos o del total). */
  readonly aristas: readonly string[]

  constructor(problemas: string[], aristas: string[]) {
    const lista = problemas.slice(0, 10).join('; ')
    const resto = problemas.length > 10 ? ` (y ${problemas.length - 10} más)` : ''
    super(`El grafo no se puede usar para rutear: ${lista}${resto}`)
    this.name = 'ErrorGrafoRuteable'
    this.problemas = problemas
    this.aristas = aristas
  }
}

function aCentesimas(valor: number): number | null {
  const c = Math.round(valor * 100)
  return Math.abs(valor * 100 - c) < 1e-6 ? c : null
}

const compararIds = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0)

/**
 * Longitud entera (en centésimas de px) de un tramo recto: `|dx| + |dy|` si es horizontal o
 * vertical, y la distancia euclídea redondeada **hacia arriba** si es diagonal. Redondear hacia
 * arriba mantiene la heurística consistente (`heuristica.ts`).
 */
export function longitudTramo(dx: number, dy: number): number {
  const ax = Math.abs(dx)
  const ay = Math.abs(dy)
  return ax === 0 || ay === 0 ? ax + ay : Math.ceil(Math.hypot(ax, ay))
}

/**
 * Arma el grafo ruteable a partir del grafo cargado por `preparar-datos-campus`: coordenadas y
 * longitudes en centésimas de px enteras, adyacencia ordenada por id y chequeos de carga
 * (longitud coherente con `px`, longitud total menor que `K_COSTO`). Las aristas suelen ser
 * horizontales o verticales; las diagonales (caminos diagonales del campus, que el pipeline solo
 * deja pasar si están declarados) miden su distancia euclídea.
 *
 * @throws {ErrorGrafoRuteable} si los datos violan alguna de esas reglas.
 */
export function prepararGrafoRuteable(
  grafo: GrafoCampus,
  opciones: OpcionesPreparacion = {},
): GrafoRuteable {
  const problemas: string[] = []
  const aristasConProblemas: string[] = []

  const nodosOrdenados = [...grafo.nodos].sort((a, b) => compararIds(a.id, b.id))
  const indiceNodo = new Map<string, number>()
  const coords: { cx: number; cy: number }[] = []
  for (const nodo of nodosOrdenados) {
    if (indiceNodo.has(nodo.id)) problemas.push(`nodo repetido ${nodo.id}`)
    indiceNodo.set(nodo.id, coords.length)
    const cx = aCentesimas(nodo.x)
    const cy = aCentesimas(nodo.y)
    if (cx === null || cy === null) problemas.push(`el nodo ${nodo.id} tiene más de 2 decimales`)
    coords.push({ cx: cx ?? Math.round(nodo.x * 100), cy: cy ?? Math.round(nodo.y * 100) })
  }

  const aristasOrdenadas = [...(grafo.aristas as readonly AristaConPuntos[])].sort((a, b) =>
    compararIds(a.id, b.id),
  )
  const aristas: AristaRuteable[] = []
  const indiceArista = new Map<string, number>()
  const vecinos: VecinoRuteable[][] = nodosOrdenados.map(() => [])
  let longitudTotal = 0

  for (const arista of aristasOrdenadas) {
    const ia = indiceNodo.get(arista.a)
    const ib = indiceNodo.get(arista.b)
    if (ia === undefined || ib === undefined) {
      problemas.push(`la arista ${arista.id} une un nodo que no existe`)
      aristasConProblemas.push(arista.id)
      continue
    }
    if (indiceArista.has(arista.id)) {
      problemas.push(`arista repetida ${arista.id}`)
      aristasConProblemas.push(arista.id)
      continue
    }

    const intermedios = arista.puntos ?? []
    const tramo: { cx: number; cy: number }[] = [coords[ia]!]
    for (const p of intermedios) {
      tramo.push({ cx: Math.round(p.x * 100), cy: Math.round(p.y * 100) })
    }
    tramo.push(coords[ib]!)

    let longitud = 0
    for (let i = 1; i < tramo.length; i++) {
      longitud += longitudTramo(tramo[i]!.cx - tramo[i - 1]!.cx, tramo[i]!.cy - tramo[i - 1]!.cy)
    }
    const diferencia = Math.abs(longitud / 100 - arista.px)
    if (diferencia > TOLERANCIA_PESO_PX + 1e-9) {
      problemas.push(
        `la arista ${arista.id} mide ${longitud / 100} px pero su peso es ${arista.px} px`,
      )
      aristasConProblemas.push(arista.id)
    }

    const indice = aristas.length
    indiceArista.set(arista.id, indice)
    aristas.push({
      id: arista.id,
      indice,
      a: ia,
      b: ib,
      longitud,
      exterior: arista.exterior,
      puntos: intermedios.map((p): PuntoMapa => [p.x, p.y]),
    })
    vecinos[ia]!.push({ nodo: ib, arista: indice })
    if (ib !== ia) vecinos[ib]!.push({ nodo: ia, arista: indice })
    longitudTotal += longitud
  }

  if (longitudTotal >= K_COSTO) {
    problemas.push(
      `la longitud total (${longitudTotal} centésimas de px) no es menor que K = ${K_COSTO}: hay que subir K_COSTO`,
    )
  }

  if (problemas.length > 0) throw new ErrorGrafoRuteable(problemas, aristasConProblemas)

  const nodos: NodoRuteable[] = nodosOrdenados.map((nodo, indice) => ({
    id: nodo.id,
    indice,
    x: nodo.x,
    y: nodo.y,
    cx: coords[indice]!.cx,
    cy: coords[indice]!.cy,
    // Los índices de nodo siguen el orden de los ids, y los de arista también.
    vecinos: vecinos[indice]!.sort((p, q) => p.nodo - q.nodo || p.arista - q.arista),
  }))

  return {
    version: grafo.version,
    metrosPorPx: opciones.metrosPorPx ?? grafo.metrosPorPx,
    nodos,
    aristas,
    indiceNodo,
    indiceArista,
    longitudTotal,
  }
}
