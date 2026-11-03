/**
 * Tramos de una ruta (design.md de mostrar-ruta-e-indicaciones, decisión 9, paso 1): cada par de
 * nodos consecutivos da un tramo con dirección, longitud en metros, si es al aire libre y el
 * departamento de cada extremo. También separa la polilínea en partes bajo techo y al aire libre
 * para dibujarlas en azul o en celeste (decisión 3). Puro, sin React.
 */
import type { NodoCampus, TipoNodo } from '../datos/index.ts'
import type { GrafoRuteable, PuntoMapa, RutaEncontrada } from './tipos.ts'

/** En el plano, "norte" es arriba (la y crece hacia abajo, como en Figma). */
export type Direccion = 'este' | 'oeste' | 'norte' | 'sur'

/** Vector unitario de cada dirección en coordenadas de pantalla (y hacia abajo). */
export const VECTORES: Readonly<Record<Direccion, { x: number; y: number }>> = {
  este: { x: 1, y: 0 },
  oeste: { x: -1, y: 0 },
  norte: { x: 0, y: -1 },
  sur: { x: 0, y: 1 },
}

/** Lo que las indicaciones necesitan saber de cada nodo (sale de `grafo.json`). */
export interface InfoNodo {
  tipo: TipoNodo
  depto: string
  /** 0 es planta baja. */
  piso: number
}

export type InfoNodos = ReadonlyMap<string, InfoNodo>

/** Indexa los nodos de `GrafoCampus` por id (el grafo ruteable no guarda tipo ni departamento). */
export function indexarNodos(nodos: readonly NodoCampus[]): InfoNodos {
  return new Map(nodos.map((n) => [n.id, { tipo: n.tipo, depto: n.depto, piso: n.piso ?? 0 }]))
}

export interface Tramo {
  /** Posición del tramo en la lista. */
  indice: number
  /** Índice en `ruta.nodos` del nodo donde empieza (el tramo va de `nodo` a `nodo + 1`). */
  nodo: number
  /** Ids de los extremos. */
  desde: string
  hasta: string
  /** Coordenadas de los extremos (px del plano). Si la arista dobla, son las de cada parte recta. */
  puntoDesde: PuntoMapa
  puntoHasta: PuntoMapa
  /** Dirección según el eje dominante (un desfase menor a 1 px no la cambia; un tramo diagonal toma la del eje más largo). */
  direccion: Direccion
  longitudPx: number
  longitudM: number
  exterior: boolean
  deptoDesde: string
  deptoHasta: string
  tipoDesde: TipoNodo
  tipoHasta: TipoNodo
  pisoDesde: number
  pisoHasta: number
}

export function direccionDe(desde: PuntoMapa, hasta: PuntoMapa): Direccion {
  const dx = hasta[0] - desde[0]
  const dy = hasta[1] - desde[1]
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'este' : 'oeste'
  return dy >= 0 ? 'sur' : 'norte'
}

const INFO_DESCONOCIDA: InfoNodo = { tipo: 'pasillo', depto: 'central', piso: 0 }

function nodoDe(grafo: GrafoRuteable, id: string) {
  const i = grafo.indiceNodo.get(id)
  const nodo = i === undefined ? undefined : grafo.nodos[i]
  if (!nodo) throw new Error(`La ruta pasa por ${id}, que no está en el grafo.`)
  return nodo
}

/**
 * Tramos de la ruta, en orden. Una arista que dobla (con `puntos` intermedios) da un tramo por
 * cada parte recta, todos con el mismo `nodo`.
 */
export function armarTramos(
  ruta: Pick<RutaEncontrada, 'nodos' | 'aristas'>,
  grafo: GrafoRuteable,
  info: InfoNodos,
): Tramo[] {
  const tramos: Tramo[] = []
  const metrosPorPx = grafo.metrosPorPx
  for (let i = 0; i < ruta.aristas.length; i++) {
    const idDesde = ruta.nodos[i]!
    const idHasta = ruta.nodos[i + 1]!
    const a = nodoDe(grafo, idDesde)
    const b = nodoDe(grafo, idHasta)
    const ia = grafo.indiceArista.get(ruta.aristas[i]!)
    const arista = ia === undefined ? undefined : grafo.aristas[ia]
    if (!arista)
      throw new Error(`La ruta usa la arista ${ruta.aristas[i]}, que no está en el grafo.`)
    const intermedios = arista.a === a.indice ? arista.puntos : [...arista.puntos].reverse()
    const puntos: PuntoMapa[] = [[a.x, a.y], ...intermedios, [b.x, b.y]]
    const infoA = info.get(idDesde) ?? INFO_DESCONOCIDA
    const infoB = info.get(idHasta) ?? INFO_DESCONOCIDA
    for (let k = 1; k < puntos.length; k++) {
      const p = puntos[k - 1]!
      const q = puntos[k]!
      const longitudPx = Math.hypot(q[0] - p[0], q[1] - p[1])
      tramos.push({
        indice: tramos.length,
        nodo: i,
        desde: idDesde,
        hasta: idHasta,
        puntoDesde: p,
        puntoHasta: q,
        direccion: direccionDe(p, q),
        longitudPx,
        longitudM: longitudPx * metrosPorPx,
        exterior: arista.exterior,
        deptoDesde: infoA.depto,
        deptoHasta: infoB.depto,
        tipoDesde: infoA.tipo,
        tipoHasta: infoB.tipo,
        pisoDesde: infoA.piso,
        pisoHasta: infoB.piso,
      })
    }
  }
  return tramos
}

/** Parte de la polilínea con el mismo color de trazo (azul bajo techo, celeste afuera). */
export interface PartePolilinea {
  exterior: boolean
  /** Puntos a dibujar (px del plano), sin repetidos consecutivos. */
  puntos: PuntoMapa[]
  /** Índices en `ruta.nodos` del primer y del último nodo de la parte. */
  desde: number
  hasta: number
  longitudM: number
}

/** Separa la ruta en partes consecutivas bajo techo y al aire libre. */
export function partesDeRuta(tramos: readonly Tramo[]): PartePolilinea[] {
  const partes: PartePolilinea[] = []
  for (const t of tramos) {
    const ultima = partes[partes.length - 1]
    if (ultima && ultima.exterior === t.exterior) {
      ultima.puntos.push(t.puntoHasta)
      ultima.hasta = t.nodo + 1
      ultima.longitudM += t.longitudM
    } else {
      partes.push({
        exterior: t.exterior,
        puntos: [t.puntoDesde, t.puntoHasta],
        desde: t.nodo,
        hasta: t.nodo + 1,
        longitudM: t.longitudM,
      })
    }
  }
  return partes
}

/** Puntos (px del plano) de la ruta entre dos índices de `ruta.nodos`, para encuadrar o resaltar. */
export function puntosEntre(tramos: readonly Tramo[], desde: number, hasta: number): PuntoMapa[] {
  const puntos: PuntoMapa[] = []
  for (const t of tramos) {
    if (t.nodo < desde || t.nodo >= hasta) continue
    if (puntos.length === 0) puntos.push(t.puntoDesde)
    puntos.push(t.puntoHasta)
  }
  return puntos
}
