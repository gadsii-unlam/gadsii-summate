/**
 * Validación del archivo de cierres contra el grafo (decisión 5). La misma función sirve para la
 * app (modo tolerante: se aplica todo lo que se pueda y los problemas van a la consola) y para
 * `scripts/validar-cierres.ts` (modo estricto: cualquier problema hace fallar el CI).
 */
import type { GrafoCampus } from '../datos/index.ts'
import type { GrafoRuteable } from '../rutas/index.ts'
import { parsearFecha } from './fechas.ts'
import type { Cierre, ProblemaCierres, ResultadoValidacion } from './tipos.ts'

export const MOTIVO_POR_DEFECTO = 'Cerrado temporalmente'

/** Lo que la validación necesita saber del grafo. */
export interface IndiceGrafo {
  readonly nodos: ReadonlySet<string>
  /** `<a>__<b>` y `<b>__<a>` → id de la arista en el grafo. */
  readonly aristaPorExtremos: ReadonlyMap<string, string>
}

/** Arma el índice desde `grafo.json` (`GrafoCampus`) o desde el grafo ruteable del motor. */
export function indexarGrafo(grafo: GrafoCampus | GrafoRuteable): IndiceGrafo {
  const nodos = new Set<string>()
  const aristaPorExtremos = new Map<string, string>()
  const agregar = (id: string, a: string, b: string) => {
    aristaPorExtremos.set(`${a}__${b}`, id)
    aristaPorExtremos.set(`${b}__${a}`, id)
  }
  if ('indiceNodo' in grafo) {
    for (const n of grafo.nodos) nodos.add(n.id)
    for (const e of grafo.aristas) agregar(e.id, grafo.nodos[e.a]!.id, grafo.nodos[e.b]!.id)
  } else {
    for (const n of grafo.nodos) nodos.add(n.id)
    for (const e of grafo.aristas) agregar(e.id, e.a, e.b)
  }
  return { nodos, aristaPorExtremos }
}

/**
 * Normaliza un id de arista al id del grafo: acepta `arista__A__B` y `arista__B__A`.
 * Devuelve `null` si no existe.
 */
export function normalizarArista(indice: IndiceGrafo, id: string): string | null {
  if (!id.startsWith('arista__')) return null
  return indice.aristaPorExtremos.get(id.slice('arista__'.length)) ?? null
}

const esObjeto = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)

/**
 * Valida el contenido de `cierres.json` (ya parseado) contra el grafo.
 *
 * - Ids de nodos o aristas desconocidos: se ignoran (el resto del cierre se aplica).
 * - Aristas escritas al revés: se normalizan al id del grafo (no es un problema).
 * - Fecha inválida o `hasta` no posterior a `desde`: el cierre queda `siempreVigente`.
 * - Sin motivo: se usa "Cerrado temporalmente".
 * - Sin id o id repetido: se aplica igual (con un id sintético si falta).
 * - Sin ningún nodo ni arista válido: se descarta.
 */
export function validarCierres(datos: unknown, indice: IndiceGrafo): ResultadoValidacion {
  const problemas: ProblemaCierres[] = []
  if (!esObjeto(datos) || datos.version !== 1 || !Array.isArray(datos.cierres)) {
    problemas.push({
      codigo: 'forma-invalida',
      cierre: null,
      mensaje: 'el archivo no tiene la forma { "version": 1, "cierres": [...] }',
    })
    return { formaValida: false, cierres: [], problemas }
  }

  const cierres: Cierre[] = []
  const vistos = new Set<string>()
  datos.cierres.forEach((crudo: unknown, posicion: number) => {
    const n = posicion + 1
    if (!esObjeto(crudo)) {
      problemas.push({
        codigo: 'cierre-invalido',
        cierre: null,
        mensaje: `el cierre n.º ${n} no es un objeto`,
      })
      return
    }

    let id: string
    if (typeof crudo.id === 'string' && crudo.id.trim() !== '') {
      id = crudo.id.trim()
    } else {
      id = `cierre-${n}`
      problemas.push({ codigo: 'sin-id', cierre: id, mensaje: `el cierre n.º ${n} no tiene id` })
    }
    if (vistos.has(id)) {
      problemas.push({
        codigo: 'id-duplicado',
        cierre: id,
        mensaje: `id de cierre repetido: ${id}`,
      })
    }
    vistos.add(id)

    let motivo = MOTIVO_POR_DEFECTO
    if (typeof crudo.motivo === 'string' && crudo.motivo.trim() !== '') {
      motivo = crudo.motivo.trim()
    } else {
      problemas.push({
        codigo: 'sin-motivo',
        cierre: id,
        mensaje: `el cierre ${id} no tiene motivo; se usa "${MOTIVO_POR_DEFECTO}"`,
      })
    }

    const lista = (campo: 'nodos' | 'aristas'): unknown[] => {
      const valor = crudo[campo]
      if (valor === undefined) return []
      if (Array.isArray(valor)) return valor
      problemas.push({
        codigo: 'cierre-invalido',
        cierre: id,
        mensaje: `"${campo}" del cierre ${id} no es una lista`,
      })
      return []
    }
    const desconocido = (valor: unknown) =>
      problemas.push({
        codigo: 'id-desconocido',
        cierre: id,
        mensaje: `id desconocido: ${String(valor)} en el cierre ${id}`,
      })

    const nodos = new Set<string>()
    for (const valor of lista('nodos')) {
      if (typeof valor === 'string' && indice.nodos.has(valor)) nodos.add(valor)
      else desconocido(valor)
    }
    const aristas = new Set<string>()
    for (const valor of lista('aristas')) {
      const normal = typeof valor === 'string' ? normalizarArista(indice, valor) : null
      if (normal) aristas.add(normal)
      else desconocido(valor)
    }

    const fecha = (campo: 'desde' | 'hasta'): { ms: number | null; invalida: boolean } => {
      const valor = crudo[campo]
      if (valor === undefined || valor === null) return { ms: null, invalida: false }
      const ms = typeof valor === 'string' ? parsearFecha(valor) : null
      if (ms === null) {
        problemas.push({
          codigo: 'fecha-invalida',
          cierre: id,
          mensaje: `fecha inválida en "${campo}" del cierre ${id}: ${JSON.stringify(valor)}; se considera vigente`,
        })
        return { ms: null, invalida: true }
      }
      return { ms, invalida: false }
    }
    const desde = fecha('desde')
    const hasta = fecha('hasta')
    let siempreVigente = desde.invalida || hasta.invalida
    if (desde.ms !== null && hasta.ms !== null && hasta.ms <= desde.ms) {
      siempreVigente = true
      problemas.push({
        codigo: 'hasta-no-posterior',
        cierre: id,
        mensaje: `"hasta" no es posterior a "desde" en el cierre ${id}; se considera vigente`,
      })
    }

    if (nodos.size === 0 && aristas.size === 0) {
      problemas.push({
        codigo: 'sin-tramos',
        cierre: id,
        mensaje: `el cierre ${id} no cierra ningún nodo ni arista válido; se descarta`,
      })
      return
    }

    cierres.push({
      id,
      motivo,
      nodos: [...nodos],
      aristas: [...aristas],
      desde: desde.ms,
      hasta: hasta.ms,
      siempreVigente,
    })
  })

  return { formaValida: true, cierres, problemas }
}
