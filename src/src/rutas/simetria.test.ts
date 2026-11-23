import { describe, expect, it } from 'vitest'
import { calcularRuta } from './astar.ts'
import { calcularRutaConLluvia } from './lluvia.ts'
import { GIMNASIO, excluir, grafoReal, puertas } from './test/datos-reales.ts'
import type { ResultadoRuta } from './tipos.ts'

const g = grafoReal()

function nodos(r: ResultadoRuta): string[] {
  if (r.tipo !== 'ruta') throw new Error(`se esperaba una ruta y llegó ${r.tipo}`)
  return r.nodos
}

/** Pares de puertas al azar (semilla fija). */
function pares(cantidad: number): [string, string][] {
  const todas = puertas(g)
  let semilla = 11
  const azar = () => {
    semilla = (semilla * 1103515245 + 12345) % 2 ** 31
    return Math.floor((semilla / 2 ** 31) * todas.length)
  }
  const salida: [string, string][] = []
  while (salida.length < cantidad) {
    const o = todas[azar()]!
    const d = todas[azar()]!
    if (o !== d) salida.push([o, d])
  }
  return salida
}

describe('simetría: la vuelta es la ida invertida', () => {
  for (const criterio of ['mas-corta', 'resguardada'] as const) {
    it(`calcularRuta con ${criterio}, también en los empates`, () => {
      for (const [o, d] of pares(400)) {
        const ida = nodos(calcularRuta(g, { origen: [o], destino: [d], criterio }))
        const vuelta = nodos(calcularRuta(g, { origen: [d], destino: [o], criterio }))
        expect(vuelta).toEqual([...ida].reverse())
      }
    })
  }

  it('calcularRutaConLluvia', () => {
    for (const [o, d] of pares(400)) {
      const ida = nodos(calcularRutaConLluvia(g, { origen: [o], destino: [d] }))
      const vuelta = nodos(calcularRutaConLluvia(g, { origen: [d], destino: [o] }))
      expect(vuelta).toEqual([...ida].reverse())
    }
  })

  it('con un lugar de varias puertas y con cierres', () => {
    const excluidos = excluir(['entrada-ed-este-400-500-lado-oeste'])
    for (const [o, d] of [
      [['puerta-aula-121'], [...GIMNASIO]],
      [['puerta-aula-208'], ['puerta-aula-417']],
    ] as const) {
      for (const calcular of [
        (a: readonly string[], b: readonly string[]) =>
          calcularRuta(g, { origen: a, destino: b, criterio: 'mas-corta', excluidos }),
        (a: readonly string[], b: readonly string[]) =>
          calcularRutaConLluvia(g, { origen: a, destino: b, excluidos }),
      ]) {
        expect(nodos(calcular(d, o))).toEqual([...nodos(calcular(o, d))].reverse())
      }
    }
  })
})
