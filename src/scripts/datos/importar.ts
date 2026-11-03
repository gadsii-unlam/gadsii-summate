/**
 * Importa el grafo dibujado en el plano (`mapa-unlam.svg`, grupo `grafo`) al formato de
 * `datos-fuente/grafo.json`. El plano es la única fuente: cada nodo es un `<circle>` con
 * `data-tipo`, `data-ambito`, `data-piso`, `data-nombre` y `data-edificio`, y cada arista una
 * `<line>` con `data-desde`, `data-hasta` y `data-distancia`.
 *
 * Traducción:
 * - `tipo`: `aula`, `laboratorio`, `bano`, `lugar` y `acceso-lugar` son puertas; `entrada` y
 *   `entrada-campus` son entradas; el resto (`frente-puerta`, `cruce`, `extremo`, `escalera`),
 *   pasillos.
 * - `depto`: el edificio (`data-edificio`) en el interior; `central` (la red de veredas) en el
 *   exterior y para las entradas al campus; `primer-piso` en la galería del 1er piso. Las
 *   entradas de edificio toman el edificio de su id (`entrada-ed-oeste-…` → `edificio-oeste`) y
 *   cada extremo de la escalera, el depto del piso al que llega.
 * - `exterior` de cada arista: las de `aristas-exteriores` y la de la escalera (que sale a la
 *   franja entre edificios). Así lo marca el plano, aunque un extremo sea de la vereda.
 * - `sala` de cada puerta: el contorno de la forma del plano que queda detrás de la puerta (ver
 *   `salaDePuerta`), para resaltar el lugar de destino.
 */
import type { CategoriaLugar } from '../../src/datos/tipos.ts'
import type { AristaFuente, GrafoFuente, NodoFuente } from './fuentes.ts'
import { DEPTO_VEREDAS } from './grafo.ts'
import { error, type Problema } from './problemas.ts'
import { contorno, leerElementos, leerGrafoSvg, quitarGrafo, type ElementoSvg } from './svg.ts'

const TIPOS_PUERTA = new Set(['aula', 'laboratorio', 'bano', 'lugar', 'acceso-lugar'])
const TIPOS_ENTRADA = new Set(['entrada', 'entrada-campus'])
const TIPOS_PASILLO = new Set(['frente-puerta', 'cruce', 'extremo', 'escalera'])

const CATEGORIAS: Readonly<Record<string, CategoriaLugar>> = {
  aula: 'aula',
  laboratorio: 'laboratorio',
  bano: 'bano',
}

/** Depto de la galería del 1er piso. */
export const DEPTO_PRIMER_PISO = 'primer-piso'

/** Grupos de aristas al aire libre. */
const GRUPOS_EXTERIORES = ['aristas-exteriores', 'aristas-escaleras']

/**
 * Aclaraciones del plano que el catálogo ya muestra aparte (el piso) o que no hacen falta en el
 * nombre del lugar: "Buffet (acceso)" → "Buffet", "Canchas de Vóley (1er piso)" → "Canchas de Vóley".
 */
const ACLARACION_SOBRANTE = /\s*\((?:acceso|1er piso)\)$/

export type GrafoImportado = GrafoFuente & { descripcion: string }

const redondear = (n: number): number => Math.round(n * 100) / 100

/** Tamaño del plano: `width` y `height` de la raíz (o el `viewBox`). */
function tamanoPlano(svg: string): { ancho: number; alto: number } | null {
  const raiz = /<svg\s[^>]*>/.exec(svg)?.[0] ?? ''
  const atributo = (n: string) => new RegExp(`\\s${n}="([^"]*)"`).exec(raiz)?.[1]
  const caja = atributo('viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .map(Number)
  const ancho = Number(atributo('width') ?? caja?.[2])
  const alto = Number(atributo('height') ?? caja?.[3])
  return Number.isFinite(ancho) && Number.isFinite(alto) ? { ancho, alto } : null
}

function deptoDe(el: ElementoSvg): string | null {
  const at = el.atributos
  const id = at.id ?? ''
  switch (at['data-ambito']) {
    case 'interior':
      return at['data-edificio'] ?? null
    case 'exterior':
      return DEPTO_VEREDAS
    case 'primer-piso':
      return DEPTO_PRIMER_PISO
    case 'entrada': {
      const lado = /^entrada-ed-([a-z]+)-/.exec(id)?.[1]
      return lado ? `edificio-${lado}` : null
    }
    case 'escalera':
      return at['data-piso'] === '0' ? DEPTO_VEREDAS : DEPTO_PRIMER_PISO
    default:
      return null
  }
}

function tipoDe(dataTipo: string | undefined): NodoFuente['tipo'] | null {
  if (dataTipo === undefined) return null
  if (TIPOS_PUERTA.has(dataTipo)) return 'puerta'
  if (TIPOS_ENTRADA.has(dataTipo)) return 'entrada'
  if (TIPOS_PASILLO.has(dataTipo)) return 'pasillo'
  return null
}

/** Lee el grafo del plano y lo devuelve en el formato de `datos-fuente/grafo.json`. */
export function importarGrafo(svg: string): {
  grafo: GrafoImportado | null
  problemas: Problema[]
} {
  const problemas: Problema[] = []
  const tamano = tamanoPlano(svg)
  if (!tamano) {
    problemas.push(error('importar-plano', 'El plano no tiene width y height (ni viewBox).'))
  }
  const leido = leerGrafoSvg(svg)
  if (leido.nodos.length === 0) {
    problemas.push(error('importar-plano', 'El plano no tiene nodos en el grupo "grafo".'))
  }

  const nodos: NodoFuente[] = []
  for (const el of leido.nodos) {
    const at = el.atributos
    const id = at.id
    if (!id) {
      problemas.push(
        error('importar-nodo', `Hay un <circle> del grafo sin id en (${at.cx}, ${at.cy}).`),
      )
      continue
    }
    const tipo = tipoDe(at['data-tipo'])
    const depto = deptoDe(el)
    const piso = Number(at['data-piso'] ?? 0)
    if (!tipo) {
      problemas.push(
        error(
          'importar-nodo',
          `El nodo ${id} tiene data-tipo "${at['data-tipo']}", que no se conoce.`,
          [id],
        ),
      )
    }
    if (!depto) {
      problemas.push(
        error(
          'importar-nodo',
          `El nodo ${id} no tiene edificio (data-ambito "${at['data-ambito']}").`,
          [id],
        ),
      )
    }
    if (!Number.isInteger(piso) || piso < 0) {
      problemas.push(
        error('importar-nodo', `El nodo ${id} tiene data-piso "${at['data-piso']}".`, [id]),
      )
    }
    if (!tipo || !depto) continue
    const nodo: NodoFuente = {
      id,
      tipo,
      depto,
      x: redondear(Number(at.cx)),
      y: redondear(Number(at.cy)),
      piso,
    }
    if (tipo !== 'pasillo' && at['data-nombre']) {
      nodo.nombre = at['data-nombre'].replace(ACLARACION_SOBRANTE, '')
    }
    const categoria = CATEGORIAS[at['data-tipo'] ?? '']
    if (categoria) nodo.categoria = categoria
    nodos.push(nodo)
  }

  const aristas: AristaFuente[] = []
  for (const el of leido.aristas) {
    const at = el.atributos
    const a = at['data-desde']
    const b = at['data-hasta']
    if (!a || !b) {
      problemas.push(
        error(
          'importar-arista',
          `La arista ${at.id ?? '(sin id)'} no tiene data-desde o data-hasta.`,
        ),
      )
      continue
    }
    const arista: AristaFuente = {
      id: `arista__${a}__${b}`,
      a,
      b,
      exterior: el.grupos.some((g) => GRUPOS_EXTERIORES.includes(g)),
    }
    if (at['data-distancia'] !== undefined) arista.peso = Number(at['data-distancia'])
    aristas.push(arista)
  }

  if (problemas.length > 0 || !tamano) return { grafo: null, problemas }
  agregarSalas(nodos, aristas, svg)
  return {
    grafo: {
      descripcion:
        'Generado por npm run datos:importar desde el grupo "grafo" de mapa-unlam.svg; no editar a mano. Coordenadas en px del plano; peso = longitud de la arista en px.',
      ...tamano,
      nodos,
      aristas,
    },
    problemas,
  }
}

// ---------------------------------------------------------------------------------------------
// Salas
// ---------------------------------------------------------------------------------------------

type Punto = [number, number]

/** Rellenos que no son salas: textos, fondos y las flechas rojas de entrada. */
const RELLENOS_NO_SALA = new Set([
  'none',
  'black',
  'white',
  '#000',
  '#000000',
  '#fff',
  '#ffffff',
  '#c02516',
  '#ff0000',
])
/** Área (de la caja, en px²) de una forma para que cuente como sala: ni un ícono ni un edificio. */
const AREA_MIN_SALA = 300
const AREA_MAX_SALA = 150_000
/** Distancia (px) desde la puerta, alejándose del pasillo, donde se busca la sala. */
const PASO_SALA_PX = 6

/** Formas del plano (sin el grafo) que pueden ser salas, con su contorno y el área de su caja. */
export function formasDelPlano(svg: string): { contorno: Punto[]; area: number }[] {
  const formas: { contorno: Punto[]; area: number }[] = []
  for (const el of leerElementos(quitarGrafo(svg))) {
    const relleno = (el.atributos.fill ?? '').toLowerCase()
    if (el.enDefinicion || !el.caja || RELLENOS_NO_SALA.has(relleno) || relleno === '') continue
    const area = (el.caja.x2 - el.caja.x1) * (el.caja.y2 - el.caja.y1)
    if (area < AREA_MIN_SALA || area > AREA_MAX_SALA) continue
    const puntos = contorno(el)
    if (puntos) formas.push({ contorno: puntos, area })
  }
  return formas
}

function adentro([x, y]: Punto, poligono: readonly Punto[]): boolean {
  let dentro = false
  for (let i = 0, j = poligono.length - 1; i < poligono.length; j = i++) {
    const [xi, yi] = poligono[i] as Punto
    const [xj, yj] = poligono[j] as Punto
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dentro = !dentro
  }
  return dentro
}

/**
 * Sala de una puerta: la forma más chica del plano que contiene el punto a `PASO_SALA_PX` de la
 * puerta, del lado opuesto al pasillo de enfrente. `null` si no hay ninguna (o si la puerta está
 * en el mismo lugar que el pasillo).
 */
export function salaDePuerta(
  puerta: { x: number; y: number },
  frente: { x: number; y: number },
  formas: readonly { contorno: Punto[]; area: number }[],
): Punto[] | null {
  const dx = puerta.x - frente.x
  const dy = puerta.y - frente.y
  const largo = Math.hypot(dx, dy)
  if (largo === 0) return null
  const punto: Punto = [
    puerta.x + (dx / largo) * PASO_SALA_PX,
    puerta.y + (dy / largo) * PASO_SALA_PX,
  ]
  let mejor: { contorno: Punto[]; area: number } | null = null
  for (const f of formas) {
    if ((!mejor || f.area < mejor.area) && adentro(punto, f.contorno)) mejor = f
  }
  if (!mejor) return null
  const sala: Punto[] = []
  for (const [x, y] of mejor.contorno) {
    const p: Punto = [redondear(x), redondear(y)]
    const ultimo = sala[sala.length - 1]
    if (!ultimo || ultimo[0] !== p[0] || ultimo[1] !== p[1]) sala.push(p)
  }
  const [primero, ultimo] = [sala[0], sala[sala.length - 1]]
  if (sala.length > 1 && primero![0] === ultimo![0] && primero![1] === ultimo![1]) sala.pop()
  return sala.length >= 3 ? sala : null
}

/** Agrega a cada puerta la sala que tiene detrás (si se encuentra). */
function agregarSalas(nodos: NodoFuente[], aristas: readonly AristaFuente[], svg: string): void {
  const porId = new Map(nodos.map((n) => [n.id, n]))
  const vecino = new Map<string, string>()
  for (const a of aristas) {
    vecino.set(a.a, a.b)
    vecino.set(a.b, a.a)
  }
  const formas = formasDelPlano(svg)
  for (const n of nodos) {
    if (n.tipo !== 'puerta') continue
    const frente = porId.get(vecino.get(n.id) ?? '')
    const sala = frente ? salaDePuerta(n, frente, formas) : null
    if (sala) n.sala = sala
  }
}
