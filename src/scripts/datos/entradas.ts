/**
 * Nombres visibles de las entradas de edificio (`datos-fuente/entradas.json`, design.md de
 * mostrar-ruta-e-indicaciones, decisión 10) y nodos frontera entre bajo techo y aire libre.
 *
 * - Un id que no es una entrada de edificio del grafo frena el build.
 * - Las entradas de edificio sin nombre solo se reportan: las indicaciones usan el texto genérico.
 * - Los pasillos donde la ruta sale al aire libre sin pasar por una `entrada-*` se reportan para
 *   que el equipo decida si son entradas sin marcar.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { GrafoCampus } from '../../src/datos/tipos.ts'
import { leerJson, validarContraEsquema } from './fuentes.ts'
import { ErrorDatos, aviso, error, info, type Problema } from './problemas.ts'

export const ARCHIVO_ENTRADAS = 'entradas.json'
export const ESQUEMA_ENTRADAS = 'entradas.schema.json'

export type NombresEntradasFuente = Record<string, string>

/** `true` si el nodo es una entrada de edificio (no una entrada al campus). */
export const esEntradaDeEdificio = (n: { tipo: string; depto: string }): boolean =>
  n.tipo === 'entrada' && n.depto !== 'central'

/**
 * Lee `entradas.json` y lo valida contra su esquema. Si el archivo no existe devuelve `null`
 * (todas las entradas quedan sin nombre).
 */
export function leerEntradas(dir: string): NombresEntradasFuente | null {
  const ruta = join(dir, ARCHIVO_ENTRADAS)
  if (!existsSync(ruta)) return null
  const datos = leerJson(ruta, ARCHIVO_ENTRADAS)
  const esquema = leerJson(join(dir, ESQUEMA_ENTRADAS), ESQUEMA_ENTRADAS) as object
  const fallas = validarContraEsquema(datos, esquema)
  if (fallas.length > 0) {
    throw new ErrorDatos(
      fallas.map((f) =>
        error('fuente-esquema', `${ARCHIVO_ENTRADAS}: ${f} (ver ${ESQUEMA_ENTRADAS}).`),
      ),
    )
  }
  const resto = { ...(datos as Record<string, string>) }
  delete resto.$schema
  return resto
}

/** Chequea los nombres contra el grafo. */
export function validarEntradas(
  grafo: Pick<GrafoCampus, 'nodos'>,
  nombres: NombresEntradasFuente | null,
): Problema[] {
  const problemas: Problema[] = []
  const porId = new Map(grafo.nodos.map((n) => [n.id, n]))
  if (nombres === null) {
    problemas.push(
      aviso(
        'entradas-sin-archivo',
        `No hay ${ARCHIVO_ENTRADAS}: ninguna entrada de edificio tiene nombre en las indicaciones.`,
      ),
    )
    nombres = {}
  }
  for (const id of Object.keys(nombres).sort()) {
    const nodo = porId.get(id)
    if (!nodo) {
      problemas.push(
        error(
          'entrada-inexistente',
          `${ARCHIVO_ENTRADAS} nombra ${id}, que no existe en el grafo.`,
          [id],
        ),
      )
    } else if (!esEntradaDeEdificio(nodo)) {
      problemas.push(
        error(
          'entrada-inexistente',
          `${ARCHIVO_ENTRADAS} nombra ${id}, que no es una entrada de edificio (es ${nodo.tipo} de ${nodo.depto}).`,
          [id],
        ),
      )
    }
  }
  const sinNombre = grafo.nodos
    .filter((n) => esEntradaDeEdificio(n) && !(n.id in nombres))
    .map((n) => n.id)
    .sort()
  for (const id of sinNombre) {
    problemas.push(
      aviso(
        'entrada-sin-nombre',
        `${id} no tiene nombre en ${ARCHIVO_ENTRADAS}: las indicaciones no la mencionan.`,
        [id],
      ),
    )
  }
  return problemas
}

/**
 * Nodos donde se pasa de bajo techo al aire libre (tienen aristas interiores y exteriores) que no
 * son `entrada-*` ni puertas. Las indicaciones dicen ahí "salí de … al aire libre".
 */
export function nodosFronteraSinEntrada(grafo: Pick<GrafoCampus, 'nodos' | 'aristas'>): string[] {
  const tipos = new Map<string, Set<boolean>>()
  for (const a of grafo.aristas) {
    for (const id of [a.a, a.b]) {
      const s = tipos.get(id) ?? new Set<boolean>()
      s.add(a.exterior)
      tipos.set(id, s)
    }
  }
  return grafo.nodos
    .filter((n) => n.tipo === 'pasillo' && tipos.get(n.id)?.size === 2)
    .map((n) => n.id)
    .sort()
}

export function reportarFrontera(grafo: Pick<GrafoCampus, 'nodos' | 'aristas'>): Problema[] {
  const ids = nodosFronteraSinEntrada(grafo)
  if (ids.length === 0) return []
  return [
    info(
      'frontera-sin-entrada',
      `${ids.length} pasillos pasan de bajo techo al aire libre sin una entrada marcada (¿entradas sin marcar en el plano?): ${ids.join(', ')}.`,
      ids,
    ),
  ]
}
