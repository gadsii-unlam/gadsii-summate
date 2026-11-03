import type { Caja } from '../../src/datos/tipos.ts'

/**
 * Lectura mínima del SVG del plano: un elemento por etiqueta, sin texto (las etiquetas del plano
 * son paths). Alcanza para leer el grafo dibujado en el grupo `grafo` y para sacarlo del plano.
 */

/** Matriz afín [a, b, c, d, e, f] (como en SVG: x' = a·x + c·y + e, y' = b·x + d·y + f). */
export type Matriz = [number, number, number, number, number, number]
const IDENTIDAD: Matriz = [1, 0, 0, 1, 0, 0]

const multiplicar = (m: Matriz, n: Matriz): Matriz => [
  m[0] * n[0] + m[2] * n[1],
  m[1] * n[0] + m[3] * n[1],
  m[0] * n[2] + m[2] * n[3],
  m[1] * n[2] + m[3] * n[3],
  m[0] * n[4] + m[2] * n[5] + m[4],
  m[1] * n[4] + m[3] * n[5] + m[5],
]

const aplicar = (m: Matriz, x: number, y: number): [number, number] => [
  m[0] * x + m[2] * y + m[4],
  m[1] * x + m[3] * y + m[5],
]

function numeros(texto: string): number[] {
  return (texto.match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number)
}

export function parsearTransform(texto: string | undefined): Matriz {
  if (!texto) return IDENTIDAD
  let m = IDENTIDAD
  for (const [, nombre, args] of texto.matchAll(/(\w+)\s*\(([^)]*)\)/g)) {
    const v = numeros(args as string)
    let t: Matriz = IDENTIDAD
    switch (nombre) {
      case 'matrix':
        t = [v[0] ?? 1, v[1] ?? 0, v[2] ?? 0, v[3] ?? 1, v[4] ?? 0, v[5] ?? 0]
        break
      case 'translate':
        t = [1, 0, 0, 1, v[0] ?? 0, v[1] ?? 0]
        break
      case 'scale':
        t = [v[0] ?? 1, 0, 0, v[1] ?? v[0] ?? 1, 0, 0]
        break
      case 'rotate': {
        const rad = ((v[0] ?? 0) * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        const cx = v[1] ?? 0
        const cy = v[2] ?? 0
        t = [cos, sin, -sin, cos, cx - cos * cx + sin * cy, cy - sin * cx - cos * cy]
        break
      }
      default:
        throw new Error(`Transformación SVG no soportada: ${String(nombre)}`)
    }
    m = multiplicar(m, t)
  }
  return m
}

/** Puntos de control de un `d` (extremos y controles: su caja contiene a la curva). */
function puntosDePath(d: string): [number, number][] {
  const puntos: [number, number][] = []
  let x = 0
  let y = 0
  let inicioX = 0
  let inicioY = 0
  for (const [, cmd, args] of d.matchAll(/([MmLlHhVvCcSsQqTtAaZz])([^MmLlHhVvCcSsQqTtAaZz]*)/g)) {
    const v = numeros(args as string)
    const rel = cmd === (cmd as string).toLowerCase()
    const c = (cmd as string).toUpperCase()
    const px = (i: number) => (v[i] ?? 0) + (rel ? x : 0)
    const py = (i: number) => (v[i] ?? 0) + (rel ? y : 0)
    const paso = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, A: 7, Z: 0 }[c] ?? 0
    if (c === 'Z') {
      x = inicioX
      y = inicioY
      continue
    }
    for (let i = 0; i + paso <= v.length; i += paso) {
      const base = (j: number) => i + j
      if (c === 'H') {
        x = px(base(0))
        puntos.push([x, y])
      } else if (c === 'V') {
        y = py(base(0))
        puntos.push([x, y])
      } else if (c === 'A') {
        const nx = px(base(5))
        const ny = py(base(6))
        // Caja aproximada del arco: extremos más el radio alrededor de ambos.
        const r = Math.max(Math.abs(v[base(0)] ?? 0), Math.abs(v[base(1)] ?? 0))
        puntos.push([x - r, y - r], [x + r, y + r], [nx - r, ny - r], [nx + r, ny + r])
        x = nx
        y = ny
      } else {
        for (let j = 0; j < paso; j += 2) puntos.push([px(base(j)), py(base(j + 1))])
        x = px(base(paso - 2))
        y = py(base(paso - 1))
      }
      if (c === 'M' && i === 0) {
        inicioX = x
        inicioY = y
      }
    }
  }
  return puntos
}

export interface ElementoSvg {
  etiqueta: string
  atributos: Record<string, string>
  /** Posición en el texto del SVG (para poder sacarlo). */
  inicio: number
  fin: number
  /** Caja en coordenadas del plano (con las transformaciones aplicadas). */
  caja: Caja | null
  /** Transformación acumulada (la del elemento y la de sus grupos). */
  matriz: Matriz
  /** `true` si está dentro de `<defs>`, `<mask>` o `<clipPath>` (no se dibuja directo). */
  enDefinicion: boolean
  /** Ids de los grupos (y demás contenedores con id) que lo contienen, del más externo al más interno. */
  grupos: string[]
}

const FORMAS = new Set(['path', 'circle', 'ellipse', 'rect', 'line', 'polyline', 'polygon'])
const DEFINICIONES = new Set(['defs', 'mask', 'clipPath', 'pattern', 'symbol', 'marker'])

function atributosDe(texto: string): Record<string, string> {
  const atributos: Record<string, string> = {}
  for (const [, nombre, valor] of texto.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    atributos[nombre as string] = valor as string
  }
  return atributos
}

function puntosDeForma(etiqueta: string, at: Record<string, string>): [number, number][] {
  const n = (k: string) => Number(at[k] ?? 0)
  switch (etiqueta) {
    case 'path':
      return puntosDePath(at.d ?? '')
    case 'circle':
      return [
        [n('cx') - n('r'), n('cy') - n('r')],
        [n('cx') + n('r'), n('cy') + n('r')],
      ]
    case 'ellipse':
      return [
        [n('cx') - n('rx'), n('cy') - n('ry')],
        [n('cx') + n('rx'), n('cy') + n('ry')],
      ]
    case 'rect':
      return [
        [n('x'), n('y')],
        [n('x') + n('width'), n('y') + n('height')],
      ]
    case 'line':
      return [
        [n('x1'), n('y1')],
        [n('x2'), n('y2')],
      ]
    default: {
      const v = numeros(at.points ?? '')
      const pts: [number, number][] = []
      for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i] as number, v[i + 1] as number])
      return pts
    }
  }
}

function cajaDePuntos(puntos: [number, number][], m: Matriz): Caja | null {
  if (puntos.length === 0) return null
  // Se transforman las cuatro esquinas de la caja local (sirve para rotaciones y escalas).
  const xs = puntos.map((p) => p[0])
  const ys = puntos.map((p) => p[1])
  const esquinas: [number, number][] = [
    [Math.min(...xs), Math.min(...ys)],
    [Math.max(...xs), Math.min(...ys)],
    [Math.min(...xs), Math.max(...ys)],
    [Math.max(...xs), Math.max(...ys)],
  ].map(([x, y]) => aplicar(m, x as number, y as number))
  const ex = esquinas.map((p) => p[0])
  const ey = esquinas.map((p) => p[1])
  return { x1: Math.min(...ex), y1: Math.min(...ey), x2: Math.max(...ex), y2: Math.max(...ey) }
}

/** Recorre las etiquetas del SVG y devuelve las formas con su caja. */
export function leerElementos(svg: string): ElementoSvg[] {
  const elementos: ElementoSvg[] = []
  const pila: { etiqueta: string; matriz: Matriz; definicion: boolean; id?: string }[] = []
  for (const coincidencia of svg.matchAll(/<(\/?)([a-zA-Z][\w:-]*)([^>]*?)(\/?)>/g)) {
    const [texto, cierre, etiqueta, resto, autocierre] = coincidencia as unknown as string[]
    const tope = pila[pila.length - 1]
    if (cierre) {
      pila.pop()
      continue
    }
    const atributos = atributosDe(resto as string)
    const matriz = multiplicar(tope?.matriz ?? IDENTIDAD, parsearTransform(atributos.transform))
    const definicion = (tope?.definicion ?? false) || DEFINICIONES.has(etiqueta as string)
    if (FORMAS.has(etiqueta as string)) {
      const inicio = coincidencia.index
      elementos.push({
        etiqueta: etiqueta as string,
        atributos,
        inicio,
        fin: inicio + (texto as string).length,
        caja: cajaDePuntos(puntosDeForma(etiqueta as string, atributos), matriz),
        matriz,
        enDefinicion: definicion,
        grupos: pila.flatMap((p) => (p.id ? [p.id] : [])),
      })
    }
    if (!autocierre && !(resto as string).endsWith('/')) {
      pila.push({ etiqueta: etiqueta as string, matriz, definicion, id: atributos.id })
    }
  }
  return elementos
}

/**
 * Contorno de una forma en coordenadas del plano: los vértices de un path (con los puntos de
 * control de las curvas, que alcanzan para una sala casi recta), de un `rect` o de un `polygon`.
 * `null` para las demás formas.
 */
export function contorno(el: ElementoSvg): [number, number][] | null {
  if (!['path', 'rect', 'polygon'].includes(el.etiqueta)) return null
  let puntos = puntosDeForma(el.etiqueta, el.atributos)
  if (el.etiqueta === 'rect') {
    const [x1, y1] = puntos[0] as [number, number]
    const [x2, y2] = puntos[1] as [number, number]
    puntos = [
      [x1, y1],
      [x2, y1],
      [x2, y2],
      [x1, y2],
    ]
  }
  return puntos.length >= 3 ? puntos.map(([x, y]) => aplicar(el.matriz, x, y)) : null
}

// ---------------------------------------------------------------------------------------------
// Grafo dibujado en el plano (grupo `grafo`)
// ---------------------------------------------------------------------------------------------

/** Id del grupo del plano que tiene el grafo: nodos como `<circle>` y aristas como `<line>`. */
export const ID_GRUPO_GRAFO = 'grafo'

const enGrafo = (el: ElementoSvg): boolean => el.grupos.includes(ID_GRUPO_GRAFO)

/** Elemento del grafo: está en el grupo `grafo` o tiene la clase `nodo` o `arista`. */
export function esDeConstruccion(el: ElementoSvg): boolean {
  const clases = (el.atributos.class ?? '').split(/\s+/)
  return enGrafo(el) || clases.includes('nodo') || clases.includes('arista')
}

/** Nodos (`<circle>`) y aristas (`<line>`) del grupo `grafo`, en el orden del archivo. */
export function leerGrafoSvg(svg: string): { nodos: ElementoSvg[]; aristas: ElementoSvg[] } {
  const elementos = leerElementos(svg).filter((el) => !el.enDefinicion && enGrafo(el))
  return {
    nodos: elementos.filter((el) => el.etiqueta === 'circle'),
    aristas: elementos.filter((el) => el.etiqueta === 'line'),
  }
}

/** Posición en el texto del grupo `grafo` (desde `<g` hasta su `</g>`), o `null` si no está. */
function rangoGrafo(svg: string): { inicio: number; fin: number } | null {
  const inicio = svg.search(new RegExp(`<g\\s[^>]*id="${ID_GRUPO_GRAFO}"`))
  if (inicio < 0) return null
  let profundidad = 0
  for (const m of svg.slice(inicio).matchAll(/<(\/?)g(?=[\s>/])[^>]*?(\/?)>/g)) {
    if (m[2]) continue
    profundidad += m[1] ? -1 : 1
    if (profundidad === 0) return { inicio, fin: inicio + m.index + m[0].length }
  }
  throw new Error(`El grupo ${ID_GRUPO_GRAFO} del plano no está cerrado.`)
}

/** Saca del SVG el grupo `grafo` completo (con sus estilos). Si no está, lo devuelve igual. */
export function quitarGrafo(svg: string): string {
  const rango = rangoGrafo(svg)
  if (!rango) return svg
  const fin = svg[rango.fin] === '\n' ? rango.fin + 1 : rango.fin
  return svg.slice(0, rango.inicio) + svg.slice(fin)
}

/** SVG con solo el grafo (mismo tamaño y `viewBox` que el plano), para superponerlo o ver los ids. */
export function soloGrafo(svg: string): string {
  const raiz = /<svg\s[^>]*>/.exec(svg)?.[0]
  const rango = rangoGrafo(svg)
  if (!raiz || !rango) throw new Error(`El plano no tiene el grupo ${ID_GRUPO_GRAFO}.`)
  return `${raiz}\n${svg.slice(rango.inicio, rango.fin)}\n</svg>\n`
}

/** Elementos que no deberían estar en un plano limpio (vacío si está limpio). */
export function elementosDeConstruccion(svg: string): ElementoSvg[] {
  return leerElementos(svg).filter((el) => !el.enDefinicion && esDeConstruccion(el))
}
