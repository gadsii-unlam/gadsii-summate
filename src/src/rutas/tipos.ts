/**
 * Tipos públicos del motor de rutas (design.md de calcular-ruta-astar, decisión 9).
 *
 * Unidades: las coordenadas y distancias "Px" del resultado están en px de `mapa-unlam` (el mismo
 * sistema que `grafo.json` y el visor). Internamente el grafo ruteable guarda todo en centésimas
 * de px enteras para que la aritmética sea exacta.
 */

/** `mas-corta`: menor distancia (desempata por menos exterior). `resguardada`: menos exterior (desempata por distancia). */
export type Criterio = 'mas-corta' | 'resguardada'

export const CRITERIOS: readonly Criterio[] = ['mas-corta', 'resguardada']

/** Nodos y aristas que la ruta no puede usar. Excluir un nodo excluye todas sus aristas. */
export interface TramosExcluidos {
  /** Ids de nodos (`puerta-…`, `pasillo-…`, `entrada-…`). */
  nodos: ReadonlySet<string>
  /** Ids de aristas (`arista__<a>__<b>`). */
  aristas: ReadonlySet<string>
}

export interface ConsultaRuta {
  /** Ids de nodos de salida (las puertas del lugar de origen, según el catálogo). */
  origen: readonly string[]
  /** Ids de nodos de llegada (las puertas del lugar de destino). */
  destino: readonly string[]
  criterio: Criterio
  /** Tramos que no se pueden usar. Los ids que no existen en el grafo se ignoran. */
  excluidos?: TramosExcluidos
}

/** Un punto de la polilínea: `[x, y]` en px de `mapa-unlam`. */
export type PuntoMapa = [x: number, y: number]

export interface RutaEncontrada {
  tipo: 'ruta'
  criterio: Criterio
  /** Ids de nodos en orden, desde `puertaOrigen` hasta `puertaDestino` (ambas incluidas). */
  nodos: string[]
  /** Ids de aristas en orden; `aristas[i]` une `nodos[i]` con `nodos[i + 1]`. */
  aristas: string[]
  /** Puntos a dibujar, sin repetidos consecutivos; todos los tramos son horizontales o verticales. */
  polilinea: PuntoMapa[]
  puertaOrigen: string
  puertaDestino: string
  /** Longitud total en px del mapa (exacta a 0,01 px). */
  distanciaPx: number
  /** `distanciaPx × metrosPorPx`, redondeado a 0,1 m. */
  distanciaM: number
  /** Segundos de caminata a 1,2 m/s, redondeados al segundo. */
  tiempoSeg: number
  /** `max(1, round(segundos / 60))`. */
  tiempoMin: number
  /** Suma de las aristas exteriores (al aire libre), en px. */
  exteriorPx: number
  /** `exteriorPx × metrosPorPx`, redondeado a 0,1 m. */
  exteriorM: number
  /** Nodos que A* sacó de la cola (cerrados). Informativo, para medir. */
  nodosExpandidos: number
}

export type MotivoSinRuta = 'origen-sin-puertas' | 'destino-sin-puertas' | 'sin-camino'

export type ResultadoRuta =
  | RutaEncontrada
  | { tipo: 'mismo-lugar'; nodo: string; distanciaPx: 0; distanciaM: 0 }
  | { tipo: 'sin-ruta'; motivo: MotivoSinRuta }
  | { tipo: 'consulta-invalida'; idsDesconocidos: string[] }

/** Nodo del grafo ruteable. `cx`/`cy` en centésimas de px enteras; `x`/`y` en px. */
export interface NodoRuteable {
  readonly id: string
  readonly indice: number
  readonly x: number
  readonly y: number
  readonly cx: number
  readonly cy: number
  /** Vecinos ordenados por id de nodo (y por id de arista ante aristas paralelas). */
  readonly vecinos: readonly VecinoRuteable[]
}

export interface VecinoRuteable {
  /** Índice del nodo vecino en `GrafoRuteable.nodos`. */
  readonly nodo: number
  /** Índice de la arista en `GrafoRuteable.aristas`. */
  readonly arista: number
}

export interface AristaRuteable {
  readonly id: string
  readonly indice: number
  /** Índices de los extremos en `GrafoRuteable.nodos`. */
  readonly a: number
  readonly b: number
  /** Longitud en centésimas de px enteras (`|dx| + |dy|` de cada tramo). */
  readonly longitud: number
  readonly exterior: boolean
  /** Puntos intermedios en px, en sentido de `a` hacia `b` (vacío si la arista es un segmento recto). */
  readonly puntos: readonly PuntoMapa[]
}

/**
 * Grafo listo para rutear: se arma una vez con `prepararGrafoRuteable` y se reutiliza en cada
 * consulta. Los nodos están ordenados por id, así que comparar índices es comparar ids.
 */
export interface GrafoRuteable {
  readonly version: string
  readonly metrosPorPx: number
  readonly nodos: readonly NodoRuteable[]
  readonly aristas: readonly AristaRuteable[]
  readonly indiceNodo: ReadonlyMap<string, number>
  readonly indiceArista: ReadonlyMap<string, number>
  /** Suma de las longitudes de todas las aristas, en centésimas de px. */
  readonly longitudTotal: number
}
