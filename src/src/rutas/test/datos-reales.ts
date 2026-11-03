import grafoJson from '../../../public/data/grafo.json'
import type { GrafoCampus } from '../../datos/index.ts'
import { prepararGrafoRuteable } from '../grafo-ruteable.ts'
import type { GrafoRuteable } from '../tipos.ts'

/** `public/data/grafo.json` tal como lo genera `npm run datos:build` (solo para tests). */
export const GRAFO_CAMPUS = grafoJson as GrafoCampus

let cache: GrafoRuteable | null = null

/** Grafo ruteable real, preparado una vez por archivo de test. */
export function grafoReal(): GrafoRuteable {
  cache ??= prepararGrafoRuteable(GRAFO_CAMPUS)
  return cache
}

/** Puertas del Gimnasio (lugar `gimnasio`): el único lugar exterior con dos accesos. */
export const GIMNASIO = ['acceso-gimnasio-norte', 'acceso-gimnasio-sur'] as const

export function excluir(nodos: string[] = [], aristas: string[] = []) {
  return { nodos: new Set(nodos), aristas: new Set(aristas) }
}

/** Ids de todas las puertas del grafo, en orden. */
export function puertas(grafo: GrafoRuteable): string[] {
  const tipos = new Map(GRAFO_CAMPUS.nodos.map((n) => [n.id, n.tipo]))
  return grafo.nodos.map((n) => n.id).filter((id) => tipos.get(id) === 'puerta')
}

/** El único camino diagonal del campus (`diagonalesPermitidas` en `datos-fuente/config.json`). */
export const ARISTA_DIAGONAL = 'arista__cruce-camino-diagonal-franja__cruce-camino-diagonal-vereda'
