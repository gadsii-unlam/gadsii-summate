import { describe, expect, it } from 'vitest'
import { calcularRuta } from './astar.ts'
import { calcularRutaConLluvia } from './lluvia.ts'
import { GIMNASIO, GRAFO_CAMPUS, excluir, grafoReal, puertas } from './test/datos-reales.ts'
import type { ResultadoRuta, RutaEncontrada } from './tipos.ts'

const g = grafoReal()
const depto = new Map(GRAFO_CAMPUS.nodos.map((n) => [n.id, n.depto]))
const esEntrada = (id: string) => id.startsWith('entrada-')

function ruta(r: ResultadoRuta): RutaEncontrada {
  if (r.tipo !== 'ruta') throw new Error(`se esperaba una ruta y llegó ${r.tipo}`)
  return r
}

describe('calcularRutaConLluvia', () => {
  it('entre edificios usa la entrada más cercana a una de las puntas (Aula 208 → Aula 417)', () => {
    const r = ruta(
      calcularRutaConLluvia(g, { origen: ['puerta-aula-208'], destino: ['puerta-aula-417'] }),
    )
    expect(r.criterio).toBe('resguardada')
    // Gana la regla aplicada desde el Aula 208: sale del Edificio Oeste por Socioculturales, la
    // entrada más cercana al aula (la otra, entrar al 400-500 por el lado oeste, da 485 m con
    // 64 m afuera).
    expect(r.nodos.filter(esEntrada)).toEqual(['entrada-ed-oeste-socioculturales'])
    expect(r.distanciaM).toBeCloseTo(507.9, 0)
    expect(r.exteriorM).toBeCloseTo(59.4, 0)

    // Comparada con minimizar el exterior en todo el recorrido (la pasarela norte) y con la más rápida.
    const todoResguardado = ruta(
      calcularRuta(g, {
        origen: ['puerta-aula-208'],
        destino: ['puerta-aula-417'],
        criterio: 'resguardada',
      }),
    )
    const masCorta = ruta(
      calcularRuta(g, {
        origen: ['puerta-aula-208'],
        destino: ['puerta-aula-417'],
        criterio: 'mas-corta',
      }),
    )
    expect(r.distanciaM).toBeLessThan(todoResguardado.distanciaM)
    expect(r.exteriorM).toBeLessThan(masCorta.exteriorM)
  })

  it('el camino es continuo y no repite nodos', () => {
    const r = ruta(
      calcularRutaConLluvia(g, { origen: ['puerta-aula-208'], destino: ['puerta-aula-417'] }),
    )
    expect(new Set(r.nodos).size).toBe(r.nodos.length)
    expect(r.aristas).toHaveLength(r.nodos.length - 1)
    r.aristas.forEach((id, i) => {
      const a = g.aristas[g.indiceArista.get(id)!]!
      const extremos = [g.nodos[a.a]!.id, g.nodos[a.b]!.id].sort()
      expect(extremos).toEqual([r.nodos[i]!, r.nodos[i + 1]!].sort())
    })
  })

  it('si la entrada más cercana está cerrada, usa la siguiente', () => {
    const cerrada = 'entrada-ed-este-400-500-lado-oeste'
    const r = ruta(
      calcularRutaConLluvia(g, {
        origen: ['puerta-aula-208'],
        destino: ['puerta-aula-417'],
        excluidos: excluir([cerrada]),
      }),
    )
    expect(r.nodos).not.toContain(cerrada)
    const entradasEste = r.nodos.filter((id) => esEntrada(id) && depto.get(id) === 'edificio-este')
    expect(entradasEste).toHaveLength(1)
  })

  it('si la regla no acorta la resguardada, usa la resguardada (Aula 309 → Aula 103)', () => {
    // Entrando por la entrada más cercana a cualquiera de las dos aulas sale más larga que la
    // resguardada (660 m contra 512 m) y con más tramo al aire libre: no tiene sentido.
    const consulta = { origen: ['puerta-aula-309'], destino: ['puerta-aula-103'] }
    expect(calcularRutaConLluvia(g, consulta)).toEqual(
      calcularRuta(g, { ...consulta, criterio: 'resguardada' }),
    )
  })

  it('dentro del mismo edificio es la ruta resguardada de siempre', () => {
    const consulta = { origen: ['puerta-aula-309'], destino: ['puerta-aula-208'] }
    expect(calcularRutaConLluvia(g, consulta)).toEqual(
      calcularRuta(g, { ...consulta, criterio: 'resguardada' }),
    )
  })

  it('con una punta al aire libre aplica la regla desde la punta que está en un edificio', () => {
    // Del Aula 208 al Gimnasio: sale por Socioculturales, la entrada más cercana al aula, en vez
    // del rodeo de 1 km por la pasarela norte que da minimizar el exterior en todo el recorrido.
    const r = ruta(
      calcularRutaConLluvia(g, { origen: ['puerta-aula-208'], destino: [...GIMNASIO] }),
    )
    expect(r.nodos.filter(esEntrada)).toEqual(['entrada-ed-oeste-socioculturales'])
    expect(r.distanciaM).toBeCloseTo(70.4, 0)
  })

  it('con las dos puntas al aire libre es la ruta resguardada de siempre', () => {
    const consulta = {
      origen: ['acceso-biblioteca-oeste'],
      destino: ['acceso-teatro'],
    }
    expect(calcularRutaConLluvia(g, consulta)).toEqual(
      calcularRuta(g, { ...consulta, criterio: 'resguardada' }),
    )
  })

  it('sin ruta o mismo lugar devuelve lo mismo que calcularRuta', () => {
    expect(
      calcularRutaConLluvia(g, { origen: ['puerta-aula-208'], destino: ['puerta-aula-208'] }),
    ).toMatchObject({ tipo: 'mismo-lugar' })
    expect(
      calcularRutaConLluvia(g, { origen: ['no-existe'], destino: ['puerta-aula-208'] }),
    ).toMatchObject({ tipo: 'consulta-invalida' })
  })

  it('en pares al azar entre edificios, cruza por una entrada el borde de uno de los dos edificios', () => {
    const todas = puertas(g).filter((id) => depto.get(id)?.startsWith('edificio-'))
    let semilla = 7
    const azar = () => {
      semilla = (semilla * 1103515245 + 12345) % 2 ** 31
      return semilla / 2 ** 31
    }
    let probados = 0
    while (probados < 300) {
      const o = todas[Math.floor(azar() * todas.length)]!
      const d = todas[Math.floor(azar() * todas.length)]!
      if (depto.get(o) === depto.get(d)) continue
      probados++
      const r = ruta(calcularRutaConLluvia(g, { origen: [o], destino: [d] }))
      // Entra una sola vez al edificio destino, por una entrada, y no vuelve a salir; o (la misma
      // regla vista desde la otra punta) sale una sola vez del edificio de origen, por una entrada.
      const entraAlDestino = (nodos: readonly string[], edificio: string | undefined) => {
        const primera = nodos.findIndex((id) => depto.get(id) === edificio)
        return (
          esEntrada(nodos[primera]!) &&
          nodos.slice(primera).every((id) => depto.get(id) === edificio)
        )
      }
      expect(
        entraAlDestino(r.nodos, depto.get(d)) ||
          entraAlDestino([...r.nodos].reverse(), depto.get(o)),
      ).toBe(true)
      // Nunca tiene menos exterior que la ruta que minimiza el exterior en todo el recorrido.
      const minimo = ruta(calcularRuta(g, { origen: [o], destino: [d], criterio: 'resguardada' }))
      expect(r.exteriorPx).toBeGreaterThanOrEqual(minimo.exteriorPx)
    }
  })
})
