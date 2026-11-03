import { createElement } from 'react'
import type { ReactNode } from 'react'
import type { Lugar } from '../../datos/index.ts'
import { CATEGORIAS, PISOS } from '../textos.ts'

/** Pone en negrita los rangos `[inicio, fin)` del texto. */
export function resaltar(
  texto: string,
  rangos: ReadonlyArray<readonly [number, number]>,
): ReactNode {
  if (!rangos.length) return texto
  const ordenados = [...rangos].sort((a, b) => a[0] - b[0])
  const partes: ReactNode[] = []
  let pos = 0
  ordenados.forEach(([a, b], i) => {
    if (a < pos) return
    if (a > pos) partes.push(texto.slice(pos, a))
    partes.push(createElement('strong', { key: i }, texto.slice(a, b)))
    pos = b
  })
  if (pos < texto.length) partes.push(texto.slice(pos))
  return partes
}

/** "Departamento · Edificio · Categoría" (sin departamento si no tiene), igual en todas las filas. */
export function detalleLugar(lugar: Lugar): string {
  const partes = [lugar.departamento, lugar.edificio, CATEGORIAS[lugar.categoria]]
  return partes.filter((p) => p !== null).join(' · ')
}

/** "Departamento · Edificio · Categoría · Piso", para la ficha. */
export function detalleFicha(lugar: Lugar): string {
  return `${detalleLugar(lugar)} · ${PISOS[lugar.piso]}`
}
