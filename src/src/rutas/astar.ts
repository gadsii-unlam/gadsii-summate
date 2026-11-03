import { K_COSTO } from './grafo-ruteable.ts'
import { HeapMin } from './heap.ts'
import { crearHeuristica } from './heuristica.ts'
import type {
  AristaRuteable,
  ConsultaRuta,
  Criterio,
  GrafoRuteable,
  PuntoMapa,
  ResultadoRuta,
  RutaEncontrada,
} from './tipos.ts'

/** Velocidad de caminata para el tiempo estimado, en m/s. */
export const VELOCIDAD_CAMINATA_M_S = 1.2

/**
 * Costo de una arista según el criterio (decisiones 4 y 5), en enteros exactos:
 * - `mas-corta`: `K · longitud + (longitud si es exterior)` → orden (distancia, exterior).
 * - `resguardada`: `longitud` si es interior, `K · longitud` si es exterior → orden (exterior, distancia).
 */
export function costoArista(arista: AristaRuteable, criterio: Criterio): number {
  if (criterio === 'mas-corta') {
    return K_COSTO * arista.longitud + (arista.exterior ? arista.longitud : 0)
  }
  return arista.exterior ? K_COSTO * arista.longitud : arista.longitud
}

/** Factor por el que se multiplica la heurística para que siga en la escala del costo. */
function escalaHeuristica(criterio: Criterio): number {
  return criterio === 'mas-corta' ? K_COSTO : 1
}

const redondear1 = (valor: number): number => Math.round(valor * 10) / 10

/**
 * Calcula la ruta óptima entre dos conjuntos de puertas con A* (función pura, determinista).
 *
 * Orden de los chequeos: ids desconocidos en origen o destino → `consulta-invalida`;
 * puerta compartida → `mismo-lugar`; sin puertas de origen o destino disponibles (vacías o
 * excluidas) → `sin-ruta`; si la búsqueda no llega → `sin-ruta` con motivo `sin-camino`.
 */
export function calcularRuta(grafo: GrafoRuteable, consulta: ConsultaRuta): ResultadoRuta {
  const { criterio } = consulta
  const desconocidos = [...new Set([...consulta.origen, ...consulta.destino])].filter(
    (id) => !grafo.indiceNodo.has(id),
  )
  if (desconocidos.length > 0) {
    console.warn('[rutas] consulta con nodos que no existen en el grafo:', desconocidos)
    return { tipo: 'consulta-invalida', idsDesconocidos: desconocidos }
  }

  const destinoSet = new Set(consulta.destino)
  const compartido = consulta.origen.find((id) => destinoSet.has(id))
  if (compartido !== undefined) {
    return { tipo: 'mismo-lugar', nodo: compartido, distanciaPx: 0, distanciaM: 0 }
  }

  const nodosExcluidos = consulta.excluidos?.nodos
  const aristasExcluidas = consulta.excluidos?.aristas
  const disponible = (id: string): boolean => !nodosExcluidos?.has(id)

  const origenes = [...new Set(consulta.origen.filter(disponible))]
    .map((id) => grafo.indiceNodo.get(id)!)
    .sort((a, b) => a - b)
  if (origenes.length === 0) return { tipo: 'sin-ruta', motivo: 'origen-sin-puertas' }
  const destinos = [...new Set(consulta.destino.filter(disponible))]
    .map((id) => grafo.indiceNodo.get(id)!)
    .sort((a, b) => a - b)
  if (destinos.length === 0) return { tipo: 'sin-ruta', motivo: 'destino-sin-puertas' }

  const n = grafo.nodos.length
  const bloqueado = new Uint8Array(n)
  if (nodosExcluidos) {
    for (const id of nodosExcluidos) {
      const i = grafo.indiceNodo.get(id)
      if (i !== undefined) bloqueado[i] = 1
    }
  }
  const aristaBloqueada = new Uint8Array(grafo.aristas.length)
  if (aristasExcluidas) {
    for (const id of aristasExcluidas) {
      const i = grafo.indiceArista.get(id)
      if (i !== undefined) aristaBloqueada[i] = 1
    }
  }
  const esDestino = new Uint8Array(n)
  for (const d of destinos) esDestino[d] = 1

  const manhattan = crearHeuristica(grafo, destinos)
  const escala = escalaHeuristica(criterio)
  const g = new Float64Array(n).fill(Infinity)
  const cerrado = new Uint8Array(n)
  const previo = new Int32Array(n).fill(-1)
  const aristaPrevia = new Int32Array(n).fill(-1)
  const cola = new HeapMin()

  for (const o of origenes) {
    g[o] = 0
    const h = escala * manhattan(o)
    cola.insertar({ f: h, h, nodo: o, g: 0 })
  }

  let expandidos = 0
  let llegada = -1
  for (let entrada = cola.extraer(); entrada !== undefined; entrada = cola.extraer()) {
    const u = entrada.nodo
    if (cerrado[u] === 1 || entrada.g !== g[u]) continue
    cerrado[u] = 1
    expandidos++
    if (esDestino[u] === 1) {
      llegada = u
      break
    }
    const gu = g[u]!
    for (const { nodo: v, arista } of grafo.nodos[u]!.vecinos) {
      if (cerrado[v] === 1 || bloqueado[v] === 1 || aristaBloqueada[arista] === 1) continue
      const gv = gu + costoArista(grafo.aristas[arista]!, criterio)
      if (gv < g[v]!) {
        g[v] = gv
        previo[v] = u
        aristaPrevia[v] = arista
        const h = escala * manhattan(v)
        cola.insertar({ f: gv + h, h, nodo: v, g: gv })
      }
    }
  }

  if (llegada === -1) return { tipo: 'sin-ruta', motivo: 'sin-camino' }
  return construirResultado(grafo, criterio, llegada, previo, aristaPrevia, expandidos)
}

/**
 * Rearma una ruta a partir de su secuencia de nodos, sin buscar (tolerar-senal-irregular: el
 * recorrido guardado se dibuja tal cual al recargar). Entre dos nodos consecutivos usa la arista
 * de menor costo para el criterio, como haría A*. Devuelve `null` si algún nodo no existe o dos
 * nodos consecutivos no son vecinos (por ejemplo, con un grafo nuevo).
 */
export function rutaDesdeNodos(
  grafo: GrafoRuteable,
  criterio: Criterio,
  nodos: readonly string[],
): RutaEncontrada | null {
  if (nodos.length < 2) return null
  const indices: number[] = []
  for (const id of nodos) {
    const i = grafo.indiceNodo.get(id)
    if (i === undefined) return null
    indices.push(i)
  }
  const previo = new Int32Array(grafo.nodos.length).fill(-1)
  const aristaPrevia = new Int32Array(grafo.nodos.length).fill(-1)
  const vistos = new Set<number>()
  vistos.add(indices[0]!)
  for (let k = 1; k < indices.length; k++) {
    const u = indices[k - 1]!
    const v = indices[k]!
    if (vistos.has(v)) return null
    vistos.add(v)
    let mejor = -1
    let costo = Infinity
    for (const vecino of grafo.nodos[u]!.vecinos) {
      if (vecino.nodo !== v) continue
      const c = costoArista(grafo.aristas[vecino.arista]!, criterio)
      if (c < costo) {
        costo = c
        mejor = vecino.arista
      }
    }
    if (mejor === -1) return null
    previo[v] = u
    aristaPrevia[v] = mejor
  }
  return construirResultado(grafo, criterio, indices[indices.length - 1]!, previo, aristaPrevia, 0)
}

function construirResultado(
  grafo: GrafoRuteable,
  criterio: Criterio,
  llegada: number,
  previo: Int32Array,
  aristaPrevia: Int32Array,
  expandidos: number,
): RutaEncontrada {
  const indicesNodos: number[] = [llegada]
  const indicesAristas: number[] = []
  for (let v = llegada; previo[v]! !== -1; v = previo[v]!) {
    indicesAristas.push(aristaPrevia[v]!)
    indicesNodos.push(previo[v]!)
  }
  indicesNodos.reverse()
  indicesAristas.reverse()

  const polilinea: PuntoMapa[] = []
  const agregar = (x: number, y: number): void => {
    const ultimo = polilinea[polilinea.length - 1]
    if (ultimo === undefined || ultimo[0] !== x || ultimo[1] !== y) polilinea.push([x, y])
  }
  const primero = grafo.nodos[indicesNodos[0]!]!
  agregar(primero.x, primero.y)

  let longitud = 0
  let exterior = 0
  indicesAristas.forEach((ia, i) => {
    const arista = grafo.aristas[ia]!
    const desde = indicesNodos[i]!
    const hasta = grafo.nodos[indicesNodos[i + 1]!]!
    const intermedios = arista.a === desde ? arista.puntos : [...arista.puntos].reverse()
    for (const [x, y] of intermedios) agregar(x, y)
    agregar(hasta.x, hasta.y)
    longitud += arista.longitud
    if (arista.exterior) exterior += arista.longitud
  })

  const distanciaPx = longitud / 100
  const exteriorPx = exterior / 100
  const metros = distanciaPx * grafo.metrosPorPx
  const segundos = metros / VELOCIDAD_CAMINATA_M_S
  const nodos = indicesNodos.map((i) => grafo.nodos[i]!.id)

  return {
    tipo: 'ruta',
    criterio,
    nodos,
    aristas: indicesAristas.map((i) => grafo.aristas[i]!.id),
    polilinea,
    puertaOrigen: nodos[0]!,
    puertaDestino: nodos[nodos.length - 1]!,
    distanciaPx,
    distanciaM: redondear1(metros),
    tiempoSeg: Math.round(segundos),
    tiempoMin: Math.max(1, Math.round(segundos / 60)),
    exteriorPx,
    exteriorM: redondear1(exteriorPx * grafo.metrosPorPx),
    nodosExpandidos: expandidos,
  }
}
