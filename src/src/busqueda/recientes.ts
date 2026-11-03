/** Destinos recientes (design.md de construir-interfaz-movil, D6). Lógica pura. */

export interface Reciente {
  id: string
  /** Momento en que se consultó (ms desde epoch). */
  cuando: number
}

export const MAXIMO_RECIENTES = 8

/** Agrega `id` adelante, sin repetidos y con un máximo de 8. No modifica la lista recibida. */
export function agregarReciente(
  lista: readonly Reciente[],
  id: string,
  cuando: number,
  maximo: number = MAXIMO_RECIENTES,
): Reciente[] {
  return [{ id, cuando }, ...lista.filter((r) => r.id !== id)].slice(0, maximo)
}

/** Descarta los recientes cuyo lugar ya no está en el catálogo (y los repetidos). */
export function recientesConocidos(
  lista: readonly Reciente[],
  existe: (id: string) => boolean,
): Reciente[] {
  const vistos = new Set<string>()
  return lista.filter((r) => {
    if (!existe(r.id) || vistos.has(r.id)) return false
    vistos.add(r.id)
    return true
  })
}

/** Valida lo leído del almacenamiento. */
export function esListaRecientes(valor: unknown): valor is Reciente[] {
  return (
    Array.isArray(valor) &&
    valor.every(
      (r: unknown) =>
        typeof r === 'object' &&
        r !== null &&
        typeof (r as Reciente).id === 'string' &&
        typeof (r as Reciente).cuando === 'number',
    )
  )
}
