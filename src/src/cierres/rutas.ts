/**
 * Rutas con cierres: exclusión de los tramos cerrados vigentes (decisión 2), motivo de
 * "Sin ruta disponible" (decisión 7) y aviso de desvío (decisión 8). Compone el motor de
 * `src/rutas/` desde afuera, sin modificarlo.
 */
import {
  calcularRuta,
  type Criterio,
  type GrafoRuteable,
  type MotivoSinRuta,
  type ResultadoRuta,
  type RutaEncontrada,
} from '../rutas/index.ts'
import {
  ENTRADAS_CAMPUS,
  bloqueosDe,
  puertasSinAcceso,
  zonaAlcanzable,
  type Bloqueos,
} from './accesibilidad.ts'
import type { Cierre } from './tipos.ts'
import { tramosDeCierres } from './vigencia.ts'

export const TEXTO_SIN_RUTA = 'Sin ruta disponible'
export const MAX_MOTIVOS = 2

export interface ConsultaConCierres {
  /** Puertas del lugar de origen (`Lugar.puertas`). */
  origen: readonly string[]
  /** Puertas del lugar de destino. */
  destino: readonly string[]
  criterio: Criterio
  /** Nombres visibles, para el texto de "Sin ruta disponible". */
  nombreOrigen?: string
  nombreDestino?: string
}

export interface CierreResumido {
  id: string
  motivo: string
}

export interface AvisoDesvio {
  /** "Evitamos un tramo cerrado: <motivo>" (o "Evitamos tramos cerrados: A y B"). */
  texto: string
  /** Cierres por los que pasaba la ruta sin exclusiones. */
  cierres: CierreResumido[]
}

export interface AccionSinRuta {
  id: 'elegir-otro-destino' | 'volver-al-mapa'
  etiqueta: string
}

export const ACCIONES_SIN_RUTA: readonly AccionSinRuta[] = [
  { id: 'elegir-otro-destino', etiqueta: 'Elegir otro destino' },
  { id: 'volver-al-mapa', etiqueta: 'Volver al mapa' },
]

export interface EstadoSinRuta {
  titulo: typeof TEXTO_SIN_RUTA
  /** El lado que quedó aislado por los cierres. */
  lado: 'origen' | 'destino'
  /** "Los accesos a Laboratorio de Química están cerrados: Escalera junto a la Radio cerrada por mantenimiento." */
  texto: string
  /** Hasta dos motivos (en el orden del archivo). */
  motivos: string[]
  /** Cuántos cierres más hay además de los `motivos` mostrados. */
  cierresMas: number
  /** Todos los cierres que impiden la ruta. */
  cierres: CierreResumido[]
  /** Puertas del destino, para mantenerlo marcado en el mapa. */
  puertasDestino: readonly string[]
  acciones: readonly AccionSinRuta[]
}

export type ResultadoConCierres =
  | (RutaEncontrada & { desvio: AvisoDesvio | null })
  | { tipo: 'sin-ruta'; motivo: MotivoSinRuta; sinRuta: EstadoSinRuta }
  | Extract<ResultadoRuta, { tipo: 'mismo-lugar' | 'consulta-invalida' }>

const resumir = (c: Cierre): CierreResumido => ({ id: c.id, motivo: c.motivo })

/**
 * Calcula la ruta sin pasar por ningún tramo de `vigentes` (los cierres vigentes ahora; ver
 * `cierresVigentes`). Agrega el aviso de desvío a una ruta y el estado "Sin ruta disponible"
 * cuando no hay camino.
 */
export function calcularRutaConCierres(
  grafo: GrafoRuteable,
  consulta: ConsultaConCierres,
  vigentes: readonly Cierre[],
): ResultadoConCierres {
  const excluidos = tramosDeCierres(vigentes)
  const r = calcularRuta(grafo, {
    origen: consulta.origen,
    destino: consulta.destino,
    criterio: consulta.criterio,
    excluidos,
  })
  if (r.tipo === 'ruta') return { ...r, desvio: avisoDeDesvio(grafo, consulta, vigentes) }
  if (r.tipo === 'sin-ruta') {
    return { ...r, sinRuta: explicarSinRuta(grafo, consulta, vigentes, r.motivo) }
  }
  return r
}

/** Cierres de `vigentes` que tocan los nodos o aristas de una ruta. */
export function cierresEnRuta(
  ruta: Pick<RutaEncontrada, 'nodos' | 'aristas'>,
  vigentes: readonly Cierre[],
): Cierre[] {
  const nodos = new Set(ruta.nodos)
  const aristas = new Set(ruta.aristas)
  return vigentes.filter(
    (c) => c.nodos.some((n) => nodos.has(n)) || c.aristas.some((a) => aristas.has(a)),
  )
}

/** Une textos: "A", "A y B", "A, B y C". */
function enumerar(textos: readonly string[]): string {
  if (textos.length <= 1) return textos[0] ?? ''
  return `${textos.slice(0, -1).join(', ')} y ${textos[textos.length - 1]}`
}

/**
 * Aviso de desvío: se calcula la misma consulta sin exclusiones y, si esa ruta pasa por algún
 * cierre vigente, se devuelve el aviso. `null` si no hay cierres vigentes o la ruta habitual no
 * los cruza.
 */
export function avisoDeDesvio(
  grafo: GrafoRuteable,
  consulta: ConsultaConCierres,
  vigentes: readonly Cierre[],
): AvisoDesvio | null {
  if (vigentes.length === 0) return null
  const habitual = calcularRuta(grafo, {
    origen: consulta.origen,
    destino: consulta.destino,
    criterio: consulta.criterio,
  })
  if (habitual.tipo !== 'ruta') return null
  const cruzados = cierresEnRuta(habitual, vigentes)
  if (cruzados.length === 0) return null
  const motivos = [...new Set(cruzados.map((c) => c.motivo))]
  const texto =
    motivos.length === 1
      ? `Evitamos un tramo cerrado: ${motivos[0]}`
      : `Evitamos tramos cerrados: ${enumerar(motivos)}`
  return { texto, cierres: cruzados.map(resumir) }
}

/** Cierres de `vigentes` que tocan el borde de `zona` o cierran alguna de `puertas`. */
function cierresDelBorde(
  grafo: GrafoRuteable,
  zona: ReadonlySet<number>,
  bloqueos: Bloqueos,
  puertas: readonly string[],
  vigentes: readonly Cierre[],
): Cierre[] {
  const nodosBorde = new Set<string>(puertas)
  const aristasBorde = new Set<string>()
  for (const i of zona) {
    for (const v of grafo.nodos[i]!.vecinos) {
      if (bloqueos.arista[v.arista]) aristasBorde.add(grafo.aristas[v.arista]!.id)
      if (bloqueos.nodo[v.nodo]) nodosBorde.add(grafo.nodos[v.nodo]!.id)
    }
  }
  return vigentes.filter(
    (c) => c.nodos.some((n) => nodosBorde.has(n)) || c.aristas.some((a) => aristasBorde.has(a)),
  )
}

/**
 * Estado "Sin ruta disponible" con el motivo (decisión 7):
 * 1. El lado aislado es el destino si está sin acceso; si no, el origen si está sin acceso; si
 *    ninguno lo está (por ejemplo, una entrada al campus que quedó aislada), el lado con la zona
 *    alcanzable más chica. Si el motor dijo que un lado no tiene puertas abiertas, es ese lado.
 * 2. Se recorre la zona alcanzable desde las puertas abiertas de ese lado y se juntan los cierres
 *    del borde (nodos cerrados vecinos, aristas cerradas con un extremo adentro) y los que cierran
 *    sus puertas.
 * 3. Se muestran hasta dos motivos y "y N cierres más".
 */
export function explicarSinRuta(
  grafo: GrafoRuteable,
  consulta: ConsultaConCierres,
  vigentes: readonly Cierre[],
  motivo: MotivoSinRuta = 'sin-camino',
): EstadoSinRuta {
  const excluidos = tramosDeCierres(vigentes)
  const bloqueos = bloqueosDe(grafo, excluidos)
  const zonaDe = (puertas: readonly string[]) => zonaAlcanzable(grafo, bloqueos, puertas)

  let lado: 'origen' | 'destino'
  if (motivo === 'destino-sin-puertas') lado = 'destino'
  else if (motivo === 'origen-sin-puertas') lado = 'origen'
  else {
    const desdeEntradas = zonaAlcanzable(grafo, bloqueos, ENTRADAS_CAMPUS)
    const alcanzables = new Set([...desdeEntradas].map((i) => grafo.nodos[i]!.id))
    if (puertasSinAcceso(consulta.destino, alcanzables, excluidos)) lado = 'destino'
    else if (puertasSinAcceso(consulta.origen, alcanzables, excluidos)) lado = 'origen'
    else lado = zonaDe(consulta.origen).size < zonaDe(consulta.destino).size ? 'origen' : 'destino'
  }

  const puertas = lado === 'destino' ? consulta.destino : consulta.origen
  const nombre = lado === 'destino' ? consulta.nombreDestino : consulta.nombreOrigen
  const cierres = cierresDelBorde(grafo, zonaDe(puertas), bloqueos, puertas, vigentes)
  const motivosUnicos = [...new Set(cierres.map((c) => c.motivo))]
  const motivos = motivosUnicos.slice(0, MAX_MOTIVOS)
  const cierresMas = motivosUnicos.length - motivos.length

  const sujeto = nombre ? `a ${nombre}` : lado === 'destino' ? 'al destino' : 'al origen'
  let texto: string
  if (motivos.length === 0) {
    texto = 'No hay un camino disponible entre estos lugares.'
  } else {
    const resto =
      cierresMas > 0 ? [`${cierresMas} ${cierresMas === 1 ? 'cierre' : 'cierres'} más`] : []
    texto = `Los accesos ${sujeto} están cerrados: ${enumerar([...motivos, ...resto])}.`
  }

  return {
    titulo: TEXTO_SIN_RUTA,
    lado,
    texto,
    motivos,
    cierresMas,
    cierres: cierres.map(resumir),
    puertasDestino: consulta.destino,
    acciones: ACCIONES_SIN_RUTA,
  }
}
