import {
  CATEGORIAS_LUGAR,
  type AristaCampus,
  type GrafoCampus,
  type NodoCampus,
  type TipoNodo,
} from '../../src/datos/tipos.ts'
import type { AristaFuente, GrafoFuente, NodoFuente } from './fuentes.ts'
import { aviso, error, type Problema } from './problemas.ts'
import { hashCorto } from './version.ts'

const TIPOS_NODO: readonly TipoNodo[] = ['puerta', 'pasillo', 'entrada']
/** Departamento de la red de veredas (puntos violetas). */
export const DEPTO_VEREDAS = 'central'
/** Diferencia tolerada entre el `peso` exportado y la longitud geométrica. */
const TOLERANCIA_PESO_PX = 0.1
/** Por debajo de esto una arista mide 0 y dos nodos están en la misma posición. */
const EPSILON_PX = 0.005

const redondear = (n: number, decimales: number): number => {
  const f = 10 ** decimales
  return Math.round(n * f) / f
}

const esNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const esTexto = (v: unknown): v is string => typeof v === 'string' && v.length > 0

/**
 * Longitud de una arista: distancia entre extremos, redondeada a 0,01 px. En las aristas
 * horizontales o verticales es `|dx| + |dy|`; solo las diagonales permitidas son más cortas.
 */
export function longitudPx(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return redondear(Math.hypot(a.x - b.x, a.y - b.y), 2)
}

/** Metros de un tramo: `round(px × metrosPorPx, 1)`. */
export function metros(px: number, metrosPorPx: number): number {
  return redondear(px * metrosPorPx, 1)
}

/**
 * Revisa que `grafo.json` tenga la forma esperada (campos y tipos). Si no la tiene, el resto de
 * las validaciones no tiene sentido y se devuelve `null`.
 */
export function leerEstructura(datos: unknown): {
  grafo: GrafoFuente | null
  problemas: Problema[]
} {
  const problemas: Problema[] = []
  const raiz = datos as Partial<Record<string, unknown>> | null
  if (typeof raiz !== 'object' || raiz === null) {
    return { grafo: null, problemas: [error('grafo-formato', 'grafo.json no es un objeto.')] }
  }
  if (!esNumero(raiz.ancho) || !esNumero(raiz.alto)) {
    problemas.push(error('grafo-formato', 'grafo.json: faltan "ancho" y "alto" numéricos.'))
  }
  if (!Array.isArray(raiz.nodos))
    problemas.push(error('grafo-formato', 'grafo.json: falta "nodos".'))
  if (!Array.isArray(raiz.aristas)) {
    problemas.push(error('grafo-formato', 'grafo.json: falta "aristas".'))
  }
  if (problemas.length > 0) return { grafo: null, problemas }

  ;(raiz.nodos as unknown[]).forEach((n, i) => {
    const nodo = n as Partial<Record<string, unknown>>
    const nombre = esTexto(nodo.id) ? nodo.id : `#${i}`
    if (!esTexto(nodo.id)) problemas.push(error('grafo-formato', `Nodo ${nombre}: falta "id".`))
    if (!TIPOS_NODO.includes(nodo.tipo as TipoNodo)) {
      problemas.push(
        error('grafo-formato', `Nodo ${nombre}: "tipo" tiene que ser puerta, pasillo o entrada.`, [
          nombre,
        ]),
      )
    }
    if (!esTexto(nodo.depto)) {
      problemas.push(error('grafo-formato', `Nodo ${nombre}: falta "depto".`, [nombre]))
    }
    if (!esNumero(nodo.x) || !esNumero(nodo.y)) {
      problemas.push(
        error('grafo-formato', `Nodo ${nombre}: "x" e "y" tienen que ser números.`, [nombre]),
      )
    }
    if (nodo.piso !== undefined && !(Number.isInteger(nodo.piso) && (nodo.piso as number) >= 0)) {
      problemas.push(
        error('grafo-formato', `Nodo ${nombre}: "piso" tiene que ser un entero ≥ 0.`, [nombre]),
      )
    }
    const sala = nodo.sala
    if (
      sala !== undefined &&
      !(
        Array.isArray(sala) &&
        sala.length >= 3 &&
        sala.every((p) => Array.isArray(p) && p.length === 2 && p.every(esNumero))
      )
    ) {
      problemas.push(
        error(
          'grafo-formato',
          `Nodo ${nombre}: "sala" tiene que ser una lista de 3 o más [x, y].`,
          [nombre],
        ),
      )
    }
    if (nodo.nombre !== undefined && !esTexto(nodo.nombre)) {
      problemas.push(error('grafo-formato', `Nodo ${nombre}: "nombre" está vacío.`, [nombre]))
    }
    if (nodo.categoria !== undefined && !CATEGORIAS_LUGAR.includes(nodo.categoria as never)) {
      problemas.push(
        error('grafo-formato', `Nodo ${nombre}: "categoria" no es una categoría de lugar.`, [
          nombre,
        ]),
      )
    }
  })
  ;(raiz.aristas as unknown[]).forEach((a, i) => {
    const arista = a as Partial<Record<string, unknown>>
    const nombre = esTexto(arista.id) ? arista.id : `#${i}`
    if (!esTexto(arista.id) || !esTexto(arista.a) || !esTexto(arista.b)) {
      problemas.push(error('grafo-formato', `Arista ${nombre}: faltan "id", "a" o "b".`, [nombre]))
    }
    if (arista.peso !== undefined && !esNumero(arista.peso)) {
      problemas.push(error('grafo-formato', `Arista ${nombre}: "peso" no es un número.`, [nombre]))
    }
    if (arista.exterior !== undefined && typeof arista.exterior !== 'boolean') {
      problemas.push(
        error('grafo-formato', `Arista ${nombre}: "exterior" tiene que ser true o false.`, [
          nombre,
        ]),
      )
    }
  })
  if (problemas.length > 0) return { grafo: null, problemas }

  return {
    grafo: {
      ancho: raiz.ancho as number,
      alto: raiz.alto as number,
      nodos: raiz.nodos as NodoFuente[],
      aristas: raiz.aristas as AristaFuente[],
    },
    problemas,
  }
}

/** Componentes conexos (por BFS), del más grande al más chico. */
function componentes(ids: readonly string[], vecinos: Map<string, string[]>): string[][] {
  const visto = new Set<string>()
  const resultado: string[][] = []
  for (const inicio of ids) {
    if (visto.has(inicio)) continue
    const comp: string[] = []
    const cola = [inicio]
    visto.add(inicio)
    while (cola.length > 0) {
      const actual = cola.pop() as string
      comp.push(actual)
      for (const v of vecinos.get(actual) ?? []) {
        if (!visto.has(v)) {
          visto.add(v)
          cola.push(v)
        }
      }
    }
    resultado.push(comp)
  }
  return resultado.sort((x, y) => y.length - x.length)
}

/**
 * Validaciones del grafo (design.md, D5). Devuelve **todos** los problemas juntos: los errores
 * frenan el build, los avisos solo se reportan. Una arista en diagonal es un error salvo que esté
 * en `diagonalesPermitidas`.
 */
export function validarGrafo(
  grafo: GrafoFuente,
  toleranciaOrtogonalPx: number,
  diagonalesPermitidas: readonly string[] = [],
): Problema[] {
  const problemas: Problema[] = []
  const permitidas = new Set(diagonalesPermitidas)

  // Ids de nodo únicos.
  const nodos = new Map<string, NodoFuente>()
  const repetidosNodo = new Set<string>()
  for (const n of grafo.nodos) {
    if (nodos.has(n.id)) repetidosNodo.add(n.id)
    else nodos.set(n.id, n)
  }
  for (const id of repetidosNodo) {
    problemas.push(error('nodo-repetido', `El id de nodo ${id} está repetido.`, [id]))
  }

  // Ids de arista únicos, extremos existentes, sin bucles ni aristas repetidas.
  const idsArista = new Set<string>()
  const pares = new Map<string, string>()
  const vecinos = new Map<string, string[]>()
  const aristasValidas: AristaFuente[] = []
  for (const ar of grafo.aristas) {
    if (idsArista.has(ar.id)) {
      problemas.push(error('arista-repetida', `El id de arista ${ar.id} está repetido.`, [ar.id]))
      continue
    }
    idsArista.add(ar.id)
    const faltantes = [ar.a, ar.b].filter((id) => !nodos.has(id))
    if (faltantes.length > 0) {
      for (const f of new Set(faltantes)) {
        problemas.push(
          error(
            'arista-extremo-inexistente',
            `La arista ${ar.id} apunta al nodo ${f}, que no existe.`,
            [ar.id, f],
          ),
        )
      }
      continue
    }
    if (ar.a === ar.b) {
      problemas.push(
        error('arista-bucle', `La arista ${ar.id} une el nodo ${ar.a} consigo mismo.`, [ar.id]),
      )
      continue
    }
    const par = [ar.a, ar.b].sort().join('|')
    const previa = pares.get(par)
    if (previa !== undefined) {
      problemas.push(
        error('arista-duplicada', `Las aristas ${previa} y ${ar.id} unen los mismos nodos.`, [
          previa,
          ar.id,
        ]),
      )
      continue
    }
    pares.set(par, ar.id)
    aristasValidas.push(ar)
    vecinos.set(ar.a, [...(vecinos.get(ar.a) ?? []), ar.b])
    vecinos.set(ar.b, [...(vecinos.get(ar.b) ?? []), ar.a])

    // Ortogonal: no puede diferir a la vez en x y en y más que la tolerancia.
    const na = nodos.get(ar.a) as NodoFuente
    const nb = nodos.get(ar.b) as NodoFuente
    const dx = Math.abs(na.x - nb.x)
    const dy = Math.abs(na.y - nb.y)
    const diagonal = dx > toleranciaOrtogonalPx && dy > toleranciaOrtogonalPx
    if (diagonal && !permitidas.has(ar.id)) {
      problemas.push(
        error(
          'arista-diagonal',
          `La arista ${ar.id} está en diagonal (Δx = ${redondear(dx, 2)} px, Δy = ${redondear(dy, 2)} px; tolerancia ${toleranciaOrtogonalPx} px). Si el camino es diagonal de verdad, agregarla a diagonalesPermitidas en config.json.`,
          [ar.id],
        ),
      )
    }

    // Avisos de la arista.
    if (!diagonal && permitidas.has(ar.id)) {
      problemas.push(
        aviso(
          'diagonal-permitida-recta',
          `La arista ${ar.id} está en diagonalesPermitidas pero es horizontal o vertical.`,
          [ar.id],
        ),
      )
    }
    const px = longitudPx(na, nb)
    if (px < EPSILON_PX) {
      problemas.push(
        aviso('arista-longitud-cero', `La arista ${ar.id} mide 0 px (${ar.a} ↔ ${ar.b}).`, [ar.id]),
      )
    }
    if (ar.peso !== undefined && Math.abs(ar.peso - px) > TOLERANCIA_PESO_PX) {
      problemas.push(
        aviso(
          'arista-peso-distinto',
          `La arista ${ar.id} tiene peso ${ar.peso} px pero mide ${px} px entre extremos; se usa ${px}.`,
          [ar.id],
        ),
      )
    }
    const esperado = `arista__${ar.a}__${ar.b}`
    if (ar.id !== esperado) {
      problemas.push(
        aviso('arista-id-formato', `La arista ${ar.id} no sigue el formato ${esperado}.`, [ar.id]),
      )
    }
  }

  for (const id of permitidas) {
    if (!idsArista.has(id)) {
      problemas.push(
        aviso(
          'diagonal-permitida-sin-arista',
          `diagonalesPermitidas menciona la arista ${id}, que no existe.`,
          [id],
        ),
      )
    }
  }

  // Nodos sin aristas.
  const ids = [...nodos.keys()]
  const aislados = ids.filter((id) => !vecinos.has(id))
  for (const id of aislados) {
    problemas.push(error('nodo-aislado', `El nodo ${id} no tiene ninguna arista.`, [id]))
  }

  // Conexo (los nodos aislados ya se informaron arriba).
  const conAristas = ids.filter((id) => vecinos.has(id))
  const comps = componentes(conAristas, vecinos)
  for (const comp of comps.slice(1)) {
    const lista = [...comp].sort()
    problemas.push(
      error(
        'grafo-no-conexo',
        `El grafo no es conexo: ${lista.length} nodo(s) quedaron separados del resto: ${lista.join(', ')}.`,
        lista,
      ),
    )
  }

  // Avisos de nodos: misma posición y puertas con más de una arista.
  const porPosicion = new Map<string, string[]>()
  for (const n of nodos.values()) {
    const clave = `${redondear(n.x, 2)},${redondear(n.y, 2)}`
    porPosicion.set(clave, [...(porPosicion.get(clave) ?? []), n.id])
  }
  for (const [clave, grupo] of porPosicion) {
    if (grupo.length > 1) {
      problemas.push(
        aviso(
          'nodos-misma-posicion',
          `Nodos distintos en la misma posición (${clave}): ${grupo.join(' / ')}.`,
          grupo,
        ),
      )
    }
  }
  for (const n of nodos.values()) {
    const grado = vecinos.get(n.id)?.length ?? 0
    if (n.tipo === 'puerta' && grado > 1) {
      problemas.push(
        aviso('puerta-varias-aristas', `La puerta ${n.id} tiene ${grado} aristas (se espera 1).`, [
          n.id,
        ]),
      )
    }
  }

  return problemas
}

/**
 * Arma el grafo que consume la app (design.md, D2): con `piso` por nodo, `px`, `m` y `exterior`
 * por arista y con `version` como hash del contenido. Supone un grafo ya validado.
 *
 * `exterior` es, en orden: la excepción curada (`exteriorForzado`), lo que dice el plano
 * (`exterior` de la fuente) o la regla (un extremo en la red de veredas).
 */
export function enriquecerGrafo(
  fuente: GrafoFuente,
  metrosPorPx: number,
  exteriorForzado: Record<string, boolean> = {},
): { grafo: GrafoCampus; problemas: Problema[] } {
  const problemas: Problema[] = []
  const nodos: NodoCampus[] = fuente.nodos.map((n) => ({
    id: n.id,
    tipo: n.tipo as TipoNodo,
    depto: n.depto,
    x: n.x,
    y: n.y,
    piso: n.piso ?? 0,
  }))
  const porId = new Map(nodos.map((n) => [n.id, n]))

  const aristas: AristaCampus[] = fuente.aristas.map((ar) => {
    const a = porId.get(ar.a) as NodoCampus
    const b = porId.get(ar.b) as NodoCampus
    const px = longitudPx(a, b)
    const porRegla = a.depto === DEPTO_VEREDAS || b.depto === DEPTO_VEREDAS
    const forzado = exteriorForzado[ar.id]
    return {
      id: ar.id,
      a: ar.a,
      b: ar.b,
      px,
      m: metros(px, metrosPorPx),
      exterior: forzado ?? ar.exterior ?? porRegla,
    }
  })

  const idsAristas = new Set(aristas.map((a) => a.id))
  for (const id of Object.keys(exteriorForzado)) {
    if (!idsAristas.has(id)) {
      problemas.push(
        aviso(
          'exterior-forzado-sin-arista',
          `exteriorForzado menciona la arista ${id}, que no existe.`,
          [id],
        ),
      )
    }
  }

  const contenido = { metrosPorPx, ancho: fuente.ancho, alto: fuente.alto, nodos, aristas }
  const version = hashCorto(JSON.stringify(contenido))
  return { grafo: { version, ...contenido }, problemas }
}
