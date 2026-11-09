import { describe, expect, it } from 'vitest'
import { HeapMin, antes, type EntradaCola } from './heap.ts'
import { crearAleatorio } from './test/aleatorio.ts'

function vaciar(heap: HeapMin): EntradaCola[] {
  const salida: EntradaCola[] = []
  for (let e = heap.extraer(); e !== undefined; e = heap.extraer()) salida.push(e)
  return salida
}

describe('HeapMin', () => {
  it('extrae 10 000 elementos aleatorios en orden (f, h, id)', () => {
    const aleatorio = crearAleatorio(42)
    const heap = new HeapMin()
    const entradas: EntradaCola[] = []
    for (let i = 0; i < 10_000; i++) {
      const e = {
        f: Math.floor(aleatorio() * 500),
        h: Math.floor(aleatorio() * 50),
        nodo: Math.floor(aleatorio() * 1000),
        g: i,
      }
      entradas.push(e)
      heap.insertar(e)
    }
    expect(heap.tamano).toBe(10_000)
    const salida = vaciar(heap)
    expect(salida).toHaveLength(10_000)
    for (let i = 1; i < salida.length; i++) expect(antes(salida[i]!, salida[i - 1]!)).toBe(false)
    const esperado = [...entradas].sort((a, b) => a.f - b.f || a.h - b.h || a.nodo - b.nodo)
    expect(salida.map((e) => [e.f, e.h, e.nodo])).toEqual(esperado.map((e) => [e.f, e.h, e.nodo]))
    expect(heap.extraer()).toBeUndefined()
  })

  it('a igual f desempata por menor h y después por menor id', () => {
    const heap = new HeapMin()
    heap.insertar({ f: 10, h: 5, nodo: 1, g: 5 })
    heap.insertar({ f: 10, h: 2, nodo: 9, g: 8 })
    heap.insertar({ f: 10, h: 2, nodo: 3, g: 8 })
    heap.insertar({ f: 9, h: 9, nodo: 7, g: 0 })
    expect(vaciar(heap).map((e) => e.nodo)).toEqual([7, 3, 9, 1])
  })

  it('admite entradas repetidas del mismo nodo (inserción perezosa)', () => {
    const heap = new HeapMin()
    heap.insertar({ f: 20, h: 0, nodo: 4, g: 20 })
    heap.insertar({ f: 12, h: 0, nodo: 4, g: 12 })
    expect(vaciar(heap).map((e) => e.g)).toEqual([12, 20])
  })
})
