import { describe, expect, it } from 'vitest'
import type { GrafoCampus } from '../datos/index.ts'
import { ErrorGrafoRuteable, K_COSTO, prepararGrafoRuteable } from './grafo-ruteable.ts'
import { ARISTA_DIAGONAL, GRAFO_CAMPUS, grafoReal } from './test/datos-reales.ts'

function grafoChico(aristas: GrafoCampus['aristas']): GrafoCampus {
  return {
    version: 'test',
    metrosPorPx: 0.35,
    ancho: 100,
    alto: 100,
    nodos: [
      { id: 'a', tipo: 'puerta', depto: 'x', x: 0, y: 0 },
      { id: 'b', tipo: 'pasillo', depto: 'x', x: 10.25, y: 0 },
      { id: 'c', tipo: 'pasillo', depto: 'x', x: 20, y: 7.5 },
    ],
    aristas,
  }
}

const arista = (id: string, a: string, b: string, px: number) => ({
  id,
  a,
  b,
  px,
  m: px * 0.35,
  exterior: false,
})

describe('prepararGrafoRuteable con el grafo real', () => {
  it('carga los 660 nodos y las 690 aristas con longitudes enteras en centésimas', () => {
    const grafo = grafoReal()
    expect(grafo.nodos).toHaveLength(660)
    expect(grafo.aristas).toHaveLength(690)
    expect(grafo.longitudTotal).toBe(3_805_275)
    expect(grafo.aristas.reduce((s, a) => s + a.longitud, 0)).toBe(3_805_275)
    expect(grafo.aristas.filter((a) => a.exterior)).toHaveLength(113)
    expect(grafo.aristas.every((a) => Number.isInteger(a.longitud))).toBe(true)
    expect(grafo.nodos.every((n) => Number.isInteger(n.cx) && Number.isInteger(n.cy))).toBe(true)
    expect(grafo.longitudTotal).toBeLessThan(K_COSTO)
  })

  it('ordena nodos y vecinos por id', () => {
    const grafo = grafoReal()
    const ids = grafo.nodos.map((n) => n.id)
    expect(ids).toEqual([...ids].sort())
    for (const nodo of grafo.nodos) {
      const vecinos = nodo.vecinos.map((v) => grafo.nodos[v.nodo]!.id)
      expect(vecinos).toEqual([...vecinos].sort())
    }
  })

  it('recalcula la longitud de cada arista: |dx| + |dy| si es recta, la euclídea hacia arriba si es la diagonal', () => {
    const grafo = grafoReal()
    for (const a of grafo.aristas) {
      const na = grafo.nodos[a.a]!
      const nb = grafo.nodos[a.b]!
      if (a.id === ARISTA_DIAGONAL) {
        expect(a.longitud).toBe(Math.ceil(Math.hypot(na.cx - nb.cx, na.cy - nb.cy)))
        expect(a.longitud).toBe(23_272)
        continue
      }
      expect(a.longitud).toBe(Math.abs(na.cx - nb.cx) + Math.abs(na.cy - nb.cy))
      expect(na.cx === nb.cx || na.cy === nb.cy).toBe(true)
    }
  })

  it('no modifica el grafo de entrada', () => {
    const primera = GRAFO_CAMPUS.aristas[0]!.id
    prepararGrafoRuteable(GRAFO_CAMPUS)
    expect(GRAFO_CAMPUS.aristas[0]!.id).toBe(primera)
  })
})

describe('chequeos de carga', () => {
  it('acepta un grafo correcto y suma los puntos intermedios de una arista que dobla', () => {
    const grafo = prepararGrafoRuteable(
      grafoChico([
        arista('arista__a__b', 'a', 'b', 10.3),
        { ...arista('arista__b__c', 'b', 'c', 17.25), puntos: [{ x: 20, y: 0 }] } as never,
      ]),
    )
    expect(grafo.aristas.map((a) => a.longitud)).toEqual([1025, 1725])
    expect(grafo.aristas[1]!.puntos).toEqual([[20, 0]])
  })

  it('acepta una arista diagonal y la mide con la euclídea redondeada hacia arriba', () => {
    // (0, 0) → (20, 7,5): √(2000² + 750²) = 2136,0009… centésimas → 2137.
    const grafo = prepararGrafoRuteable(grafoChico([arista('arista__a__c', 'a', 'c', 21.36)]))
    expect(grafo.aristas[0]!.longitud).toBe(2137)
    expect(grafo.longitudTotal).toBe(2137)
  })

  it('rechaza una diagonal cuyo peso no coincide con la euclídea, con su id', () => {
    // La Manhattan (27,5 px) no es la longitud de una diagonal.
    const crear = () => prepararGrafoRuteable(grafoChico([arista('arista__a__c', 'a', 'c', 27.5)]))
    expect(crear).toThrow(ErrorGrafoRuteable)
    expect(crear).toThrow(/arista__a__c mide 21.37 px pero su peso es 27.5 px/)
    try {
      crear()
    } catch (error) {
      expect((error as ErrorGrafoRuteable).aristas).toEqual(['arista__a__c'])
    }
  })

  it('rechaza un peso incoherente (más de 0,06 px de diferencia) con el id de la arista', () => {
    expect(() =>
      prepararGrafoRuteable(grafoChico([arista('arista__a__b', 'a', 'b', 10.4)])),
    ).toThrow(/arista__a__b mide 10.25 px pero su peso es 10.4 px/)
    // 0,05 px de diferencia (el redondeo del JSON) sí se acepta.
    expect(() =>
      prepararGrafoRuteable(grafoChico([arista('arista__a__b', 'a', 'b', 10.3)])),
    ).not.toThrow()
  })

  it('rechaza aristas con extremos inexistentes', () => {
    expect(() => prepararGrafoRuteable(grafoChico([arista('arista__a__z', 'a', 'z', 1)]))).toThrow(
      /arista__a__z une un nodo que no existe/,
    )
  })

  it('rechaza un grafo cuya longitud total no es menor que K', () => {
    const largo = grafoChico([arista('arista__a__b', 'a', 'b', 10.25)])
    largo.nodos[1] = { ...largo.nodos[1]!, x: K_COSTO / 100 }
    largo.aristas[0] = arista('arista__a__b', 'a', 'b', K_COSTO / 100)
    expect(() => prepararGrafoRuteable(largo)).toThrow(/no es menor que K/)
  })
})
