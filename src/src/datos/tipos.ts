/**
 * Formato de los datos que genera `npm run datos:build` en `public/data/` y que consume la app.
 * Los importan tanto el pipeline (`scripts/datos/`) como la app: si cambia el formato, TypeScript
 * avisa en los dos lados (design.md de preparar-datos-campus, D1, D2, D6 y D8).
 */

// ---------------------------------------------------------------------------------------------
// Grafo (public/data/grafo.json)
// ---------------------------------------------------------------------------------------------

export type TipoNodo = 'puerta' | 'pasillo' | 'entrada'

/** Un punto del plano. `x` e `y` están en px de `mapa-unlam.svg` (origen arriba a la izquierda). */
export interface NodoCampus {
  id: string
  tipo: TipoNodo
  /**
   * Edificio del punto (`edificio-oeste`, `edificio-este`, `edificio-sur`, `primer-piso`).
   * `central` es la red de veredas y caminos exteriores.
   */
  depto: string
  x: number
  y: number
  /** Piso del punto: 0 es planta baja. Si falta, planta baja. */
  piso?: number
}

/**
 * Un tramo entre dos nodos vecinos. Casi todas las aristas son horizontales o verticales; solo
 * las de `diagonalesPermitidas` (caminos diagonales de verdad) van en diagonal.
 */
export interface AristaCampus {
  /** `arista__<a>__<b>`, armado con los extremos de la `<line>` del plano. */
  id: string
  a: string
  b: string
  /** Longitud en px: la distancia entre extremos (`|xa − xb| + |ya − yb|` si es recta). */
  px: number
  /** Distancia en metros: `round(px × metrosPorPx, 1)`. */
  m: number
  /** `true` si el tramo es al aire libre según el plano, salvo excepciones curadas. */
  exterior: boolean
}

export interface GrafoCampus {
  /** Hash corto del contenido; cambia si cambia cualquier dato del grafo. */
  version: string
  /** Factor usado para calcular `m` en cada arista. Es el mismo que `METROS_POR_PX`. */
  metrosPorPx: number
  /** Tamaño del plano en px (2810 × 3745). */
  ancho: number
  alto: number
  nodos: NodoCampus[]
  aristas: AristaCampus[]
}

// ---------------------------------------------------------------------------------------------
// Catálogo de lugares (public/data/lugares.json)
// ---------------------------------------------------------------------------------------------

export const CATEGORIAS_LUGAR = [
  'aula',
  'laboratorio',
  'bano',
  'oficina',
  'servicio',
  'auditorio',
  'entrada',
] as const

export type CategoriaLugar = (typeof CATEGORIAS_LUGAR)[number]

/** `"PB"` para planta baja; `"1"`, `"2"`, `"3"` para los pisos de arriba. */
export type Piso = 'PB' | '1' | '2' | '3'

/** Rectángulo (en px del plano) que contiene todas las puertas del lugar. */
export interface Caja {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface Lugar {
  /**
   * Id estable: el id de la puerta principal sin `puerta-` ni `acceso-` (`aula-121`, `buffet`), el
   * curado para los lugares de varias puertas (`biblioteca`) o el id de la entrada al campus.
   */
  id: string
  /** Nombre visible. Es la única fuente de nombres de lugares en toda la interfaz (D7). */
  nombre: string
  /** Nombre visible del edificio. */
  edificio: string
  /** Nombre visible del departamento académico ("Derecho y Ciencia Política"), si tiene. */
  departamento: string | null
  depto: string
  categoria: CategoriaLugar
  /**
   * Nodos del grafo donde empieza o termina un recorrido. La primera es la principal.
   * En los lugares de `otrosPisos` (pisos sin nodos) son los accesos de planta baja.
   */
  puertas: string[]
  caja: Caja
  /** Textos extra para la búsqueda (el número de aula y los cargados a mano). */
  alias: string[]
  piso: Piso
  /** Referencia reconocible para elegir el origen (entradas, Biblioteca, Buffet…). */
  referencia: boolean
  /** Cómo llegar desde la planta baja; solo en lugares de otros pisos sin nodos en el grafo. */
  indicacion: string | null
  /** `true` si el nombre visible viene del plano o lo cargó el equipo; `false` si es derivado del id. */
  nombreCurado: boolean
  /**
   * Contorno de la sala de la puerta principal (px del plano), para resaltarla como destino.
   * `null` si el plano no tiene una forma reconocible detrás de la puerta.
   */
  sala: [number, number][] | null
}

export interface CatalogoLugares {
  /** Hash corto del contenido del catálogo. */
  version: string
  /** `version` del grafo con el que se armó el catálogo. */
  versionGrafo: string
  lugares: Lugar[]
}

// ---------------------------------------------------------------------------------------------
// Plano base (public/data/plano.json, SVG y respaldo)
// ---------------------------------------------------------------------------------------------

export interface PlanoBase {
  /** Hash del plano base. Va en la URL del SVG y del respaldo (`?v=`). */
  version: string
  /** Tamaño del plano en px (mismo sistema de coordenadas que el grafo). */
  ancho: number
  alto: number
  /** URL del plano vectorial (`/data/mapa-base.svg?v=<version>`), 1 unidad = 1 px del plano. */
  url: string
  /** Imagen única de respaldo para cuando el SVG no se puede mostrar. */
  respaldo: {
    url: string
    /** Escala respecto del plano (1,5 → 1 px del plano son 1,5 px de imagen). */
    escala: number
    ancho: number
    alto: number
  }
}
