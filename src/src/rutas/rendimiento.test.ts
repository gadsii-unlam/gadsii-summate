import { describe, expect, it } from 'vitest'
import { calcularRuta } from './astar.ts'
import { crearAleatorio } from './test/aleatorio.ts'
import { grafoReal, puertas } from './test/datos-reales.ts'
import { CRITERIOS } from './tipos.ts'

/** Presupuesto orientativo en CI del objetivo de < 50 ms por consulta en un celular de gama media. */
const PRESUPUESTO_MS = 5

describe('rendimiento', () => {
  it(`el promedio de 1 000 consultas aleatorias (ambos criterios) es menor que ${PRESUPUESTO_MS} ms`, () => {
    const grafo = grafoReal()
    const todas = puertas(grafo)
    const aleatorio = crearAleatorio(99)
    const consultas = Array.from({ length: 1000 }, (_, i) => ({
      origen: [todas[Math.floor(aleatorio() * todas.length)]!],
      destino: [todas[Math.floor(aleatorio() * todas.length)]!],
      criterio: CRITERIOS[i % 2]!,
    }))
    // Calentamiento del JIT.
    for (const c of consultas.slice(0, 100)) calcularRuta(grafo, c)
    const inicio = performance.now()
    for (const c of consultas) calcularRuta(grafo, c)
    const promedio = (performance.now() - inicio) / consultas.length
    console.info(`[rutas] promedio por consulta: ${promedio.toFixed(3)} ms`)
    expect(promedio).toBeLessThan(PRESUPUESTO_MS)
  })

  it('el peor caso resguardado (las dos puertas más alejadas) también entra en el presupuesto', () => {
    const grafo = grafoReal()
    const todas = puertas(grafo).map((id) => grafo.nodos[grafo.indiceNodo.get(id)!]!)
    let par: [string, string] = ['', '']
    let maximo = -1
    for (const a of todas) {
      for (const b of todas) {
        const d = Math.abs(a.cx - b.cx) + Math.abs(a.cy - b.cy)
        if (d > maximo) [maximo, par] = [d, [a.id, b.id]]
      }
    }
    const consulta = { origen: [par[0]], destino: [par[1]], criterio: 'resguardada' as const }
    for (let i = 0; i < 20; i++) calcularRuta(grafo, consulta)
    const inicio = performance.now()
    const r = calcularRuta(grafo, consulta)
    const ms = performance.now() - inicio
    console.info(`[rutas] peor caso resguardado ${par[0]} → ${par[1]}: ${ms.toFixed(3)} ms`)
    expect(r.tipo).toBe('ruta')
    expect(ms).toBeLessThan(PRESUPUESTO_MS)
  })
})
