/**
 * Índice y búsqueda de lugares (design.md de construir-interfaz-movil, D6). Lógica pura: no
 * depende de React ni del DOM.
 */
import type { Lugar } from '../datos/index.ts'
import { normalizarConMapa, normalizarConsulta } from './normalizar.ts'

/**
 * Nivel de coincidencia, de mejor a peor:
 * 1 número de aula exacto · 2 el nombre empieza con la consulta · 3 palabras del nombre ·
 * 4 alias · 5 edificio · 6 parte del nombre.
 */
export type NivelCoincidencia = 1 | 2 | 3 | 4 | 5 | 6

export interface EntradaIndice {
  lugar: Lugar
  nombre: string
  /** Para resaltar: de qué carácter del nombre visible sale cada carácter de `nombre`. */
  origenNombre: number[]
  /** Palabras del nombre con su posición en `nombre`. */
  palabrasNombre: Array<{ palabra: string; inicio: number }>
  /** Número de aula, si el nombre es un número ("Aula 121" → "121"). */
  numero: string | null
  palabrasAlias: string[]
  palabrasEdificio: string[]
}

export interface IndiceLugares {
  entradas: EntradaIndice[]
}

export interface ResultadoBusqueda {
  lugar: Lugar
  nivel: NivelCoincidencia
  /** Rangos `[inicio, fin)` del nombre visible que coinciden con lo escrito. */
  resaltado: Array<[number, number]>
}

export const MAXIMO_RESULTADOS = 50

const collator = new Intl.Collator('es', { numeric: true, sensitivity: 'base' })

/** Orden alfabético con los números en orden numérico ("Aula 2" antes que "Aula 10"). */
export function compararNombres(a: Lugar, b: Lugar): number {
  return collator.compare(a.nombre, b.nombre) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
}

function palabras(texto: string): string[] {
  return texto.split(' ').filter(Boolean)
}

function conPosiciones(texto: string): Array<{ palabra: string; inicio: number }> {
  const res: Array<{ palabra: string; inicio: number }> = []
  const re = /\S+/g
  let m: RegExpExecArray | null
  while ((m = re.exec(texto))) res.push({ palabra: m[0], inicio: m.index })
  return res
}

/** Arma el índice una vez al cargar el catálogo. */
export function crearIndice(lugares: readonly Lugar[]): IndiceLugares {
  return {
    entradas: lugares.map((lugar) => {
      const { texto: nombre, origen } = normalizarConMapa(lugar.nombre)
      const numero = /^(?:aula )?(\d+[a-z]?)$/.exec(nombre)?.[1] ?? null
      return {
        lugar,
        nombre,
        origenNombre: origen,
        palabrasNombre: conPosiciones(nombre),
        numero,
        palabrasAlias: lugar.alias.flatMap((a) => palabras(normalizarConMapa(a).texto)),
        // El edificio y el departamento: "derecho" encuentra las aulas de Derecho.
        palabrasEdificio: palabras(
          normalizarConMapa([lugar.edificio, lugar.departamento ?? ''].join(' ')).texto,
        ),
      }
    }),
  }
}

function esPrefijoDeAlguna(q: string, lista: readonly string[]): boolean {
  return lista.some((p) => p.startsWith(q))
}

function rangoOriginal(e: EntradaIndice, inicio: number, fin: number): [number, number] {
  const a = e.origenNombre[inicio] ?? 0
  const b = (e.origenNombre[fin - 1] ?? a) + 1
  return [a, b]
}

function evaluar(e: EntradaIndice, consulta: string): ResultadoBusqueda | null {
  const qs = palabras(consulta)
  const deNombre = e.palabrasNombre.map((p) => p.palabra)

  const resaltarPalabras = (): Array<[number, number]> =>
    qs.flatMap((q) => {
      const p = e.palabrasNombre.find((x) => x.palabra.startsWith(q))
      return p ? [rangoOriginal(e, p.inicio, p.inicio + q.length)] : []
    })

  if (e.numero !== null && e.numero === consulta) {
    return { lugar: e.lugar, nivel: 1, resaltado: resaltarPalabras() }
  }
  if (e.nombre.startsWith(consulta)) {
    return { lugar: e.lugar, nivel: 2, resaltado: [rangoOriginal(e, 0, consulta.length)] }
  }
  if (qs.every((q) => esPrefijoDeAlguna(q, deNombre))) {
    return { lugar: e.lugar, nivel: 3, resaltado: resaltarPalabras() }
  }
  const conAlias = [...deNombre, ...e.palabrasAlias]
  if (
    qs.some((q) => esPrefijoDeAlguna(q, e.palabrasAlias)) &&
    qs.every((q) => esPrefijoDeAlguna(q, conAlias))
  ) {
    return { lugar: e.lugar, nivel: 4, resaltado: resaltarPalabras() }
  }
  const conEdificio = [...conAlias, ...e.palabrasEdificio, ...(e.numero ? [e.numero] : [])]
  if (qs.every((q) => esPrefijoDeAlguna(q, conEdificio))) {
    return { lugar: e.lugar, nivel: 5, resaltado: resaltarPalabras() }
  }
  if (consulta.length >= 3) {
    const pos = e.nombre.indexOf(consulta)
    if (pos >= 0) {
      return {
        lugar: e.lugar,
        nivel: 6,
        resaltado: [rangoOriginal(e, pos, pos + consulta.length)],
      }
    }
  }
  return null
}

/**
 * Busca lugares. Cada palabra de la consulta tiene que ser prefijo de alguna palabra del nombre,
 * de un alias, del edificio o del número; también vale una parte del nombre de 3 caracteres o más.
 * Los resultados se ordenan por nivel y, a igual nivel, por nombre. Los lugares sin acceso no se
 * esconden ni se mandan al final: el estado de acceso no interviene en el orden.
 */
export function buscar(
  indice: IndiceLugares,
  texto: string,
  limite: number = MAXIMO_RESULTADOS,
): ResultadoBusqueda[] {
  const consulta = normalizarConsulta(texto)
  if (!consulta) return []
  const resultados: ResultadoBusqueda[] = []
  for (const e of indice.entradas) {
    const r = evaluar(e, consulta)
    if (r) resultados.push(r)
  }
  resultados.sort((a, b) => a.nivel - b.nivel || compararNombres(a.lugar, b.lugar))
  return resultados.slice(0, limite)
}
