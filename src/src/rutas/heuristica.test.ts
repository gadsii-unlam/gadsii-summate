import { describe, expect, it } from 'vitest'
import { crearHeuristica } from './heuristica.ts'
import { crearAleatorio, mezclar } from './test/aleatorio.ts'
import { dijkstraReferencia } from './test/dijkstra-referencia.ts'
import { GIMNASIO, grafoReal, puertas } from './test/datos-reales.ts'

const grafo = grafoReal()
const indice = (id: string) => grafo.indiceNodo.get(id)!

describe('heurística euclídea', () => {
  it('es la euclídea entera (hacia abajo) a la puerta destino más cercana', () => {
    const a = grafo.nodos[indice('puerta-aula-121')]!
    const b = grafo.nodos[indice('puerta-aula-110')]!
    const c = grafo.nodos[indice('puerta-lab-microscopia')]!
    const h = crearHeuristica(grafo, [b.indice, c.indice])
    const esperado = Math.min(
      Math.floor(Math.hypot(a.cx - b.cx, a.cy - b.cy)),
      Math.floor(Math.hypot(a.cx - c.cx, a.cy - c.cy)),
    )
    expect(h(a.indice)).toBe(esperado)
    expect(Number.isInteger(h(a.indice))).toBe(true)
    expect(h(b.indice)).toBe(0)
  })

  it('es consistente: h(u) ≤ longitud(u,v) + h(v) en todas las aristas, para 50 destinos', () => {
    const destinos = mezclar(puertas(grafo), crearAleatorio(7)).slice(0, 50)
    // Además de destinos simples, conjuntos de varias puertas (como el Gimnasio).
    const conjuntos = [...destinos.map((d) => [indice(d)]), GIMNASIO.map(indice)]
    let chequeos = 0
    for (const conjunto of conjuntos) {
      const h = crearHeuristica(grafo, conjunto)
      for (const a of grafo.aristas) {
        expect(h(a.a)).toBeLessThanOrEqual(a.longitud + h(a.b))
        expect(h(a.b)).toBeLessThanOrEqual(a.longitud + h(a.a))
        chequeos += 2
      }
    }
    // Incluye la arista diagonal, que mide la euclídea hacia arriba.
    expect(chequeos).toBe(51 * 690 * 2)
  })

  it('es admisible: h(n) ≤ distancia real (Dijkstra) para todos los nodos y 30 destinos', () => {
    const destinos = mezclar(puertas(grafo), crearAleatorio(11)).slice(0, 30)
    for (const destino of destinos) {
      const t = indice(destino)
      const h = crearHeuristica(grafo, [t])
      // El grafo no es dirigido: la distancia de n a t es la de t a n.
      const { distancia } = dijkstraReferencia(grafo, t, 'distancia')
      for (let n = 0; n < grafo.nodos.length; n++) {
        expect(distancia[n]).not.toBe(Infinity)
        expect(h(n)).toBeLessThanOrEqual(distancia[n]!)
      }
    }
  })
})
