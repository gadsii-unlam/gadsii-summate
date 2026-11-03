import { describe, expect, it } from 'vitest'
import { calcularRuta } from './astar.ts'
import { dijkstraReferencia } from './test/dijkstra-referencia.ts'
import { grafoReal, puertas } from './test/datos-reales.ts'
import type { Criterio } from './tipos.ts'

const grafo = grafoReal()
const todas = puertas(grafo)

/**
 * A* contra el Dijkstra de referencia en los 42 195 pares (no ordenados) de puertas, con los dos
 * criterios: misma distancia y mismo exterior (en centésimas de px exactas).
 */
describe('optimalidad contra Dijkstra de referencia (todos los pares de puertas)', () => {
  it('hay 291 puertas y 42 195 pares', () => {
    expect(todas).toHaveLength(291)
    expect((todas.length * (todas.length - 1)) / 2).toBe(42_195)
  })

  const casos: [Criterio, 'distancia-exterior' | 'exterior-distancia'][] = [
    ['mas-corta', 'distancia-exterior'],
    ['resguardada', 'exterior-distancia'],
  ]

  for (const [criterio, orden] of casos) {
    it(`${criterio}: distancia y exterior iguales a los de Dijkstra (${orden})`, () => {
      let pares = 0
      for (let i = 0; i < todas.length; i++) {
        const origen = grafo.indiceNodo.get(todas[i]!)!
        const ref = dijkstraReferencia(grafo, origen, orden)
        const simple =
          criterio === 'mas-corta' ? dijkstraReferencia(grafo, origen, 'distancia') : null
        for (let j = i + 1; j < todas.length; j++) {
          const destino = grafo.indiceNodo.get(todas[j]!)!
          const r = calcularRuta(grafo, { origen: [todas[i]!], destino: [todas[j]!], criterio })
          if (r.tipo !== 'ruta') throw new Error(`${todas[i]} → ${todas[j]}: ${r.tipo}`)
          const distancia = Math.round(r.distanciaPx * 100)
          const exterior = Math.round(r.exteriorPx * 100)
          if (distancia !== ref.distancia[destino] || exterior !== ref.exterior[destino]) {
            expect.fail(
              `${criterio} ${todas[i]} → ${todas[j]}: A* ${distancia}/${exterior}, Dijkstra ${ref.distancia[destino]}/${ref.exterior[destino]}`,
            )
          }
          if (simple && distancia !== simple.distancia[destino]) {
            expect.fail(
              `${todas[i]} → ${todas[j]}: A* ${distancia}, Dijkstra simple ${simple.distancia[destino]}`,
            )
          }
          pares++
        }
      }
      expect(pares).toBe(42_195)
    }, 60_000)
  }
})
