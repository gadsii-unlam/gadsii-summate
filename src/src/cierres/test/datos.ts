/** Datos reales y cierres de ejemplo para los tests de `src/cierres/` (no se usa en la app). */
import lugaresJson from '../../../public/data/lugares.json'
import type { CatalogoLugares, Lugar } from '../../datos/index.ts'
import { grafoReal } from '../../rutas/test/datos-reales.ts'
import type { Cierre } from '../tipos.ts'
import { indexarGrafo, validarCierres } from '../validar.ts'
import ejemplo from './cierres-ejemplo.json'

export { grafoReal }

export const ZONA_AR = 'America/Argentina/Buenos_Aires'

export const LUGARES = (lugaresJson as CatalogoLugares).lugares

export function lugar(id: string): Lugar {
  const l = LUGARES.find((x) => x.id === id)
  if (!l) throw new Error(`lugar inexistente en el catálogo: ${id}`)
  return l
}

/** Contenido de `cierres-ejemplo.json` (los tres cierres del design). */
export const ARCHIVO_EJEMPLO: unknown = ejemplo

/** Los tres cierres del design, validados contra el grafo real. */
export function cierresEjemplo(): Cierre[] {
  return validarCierres(structuredClone(ejemplo), indexarGrafo(grafoReal())).cierres
}

export function cierreDeEjemplo(id: string): Cierre {
  const c = cierresEjemplo().find((x) => x.id === id)
  if (!c) throw new Error(`cierre inexistente: ${id}`)
  return c
}

/** Un cierre vigente siempre, para armar casos. */
export function cierre(
  id: string,
  motivo: string,
  tramos: { nodos?: string[]; aristas?: string[] },
): Cierre {
  return {
    id,
    motivo,
    nodos: tramos.nodos ?? [],
    aristas: tramos.aristas ?? [],
    desde: null,
    hasta: null,
    siempreVigente: false,
  }
}
