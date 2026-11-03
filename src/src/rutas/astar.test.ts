import { afterEach, describe, expect, it, vi } from 'vitest'
import { METROS_POR_PX } from '../datos/index.ts'
import { calcularRuta, costoArista } from './astar.ts'
import { K_COSTO } from './grafo-ruteable.ts'
import { ARISTA_DIAGONAL, GIMNASIO, excluir, grafoReal } from './test/datos-reales.ts'
import type { ConsultaRuta, ResultadoRuta, RutaEncontrada } from './tipos.ts'

const grafo = grafoReal()

function ruta(
  consulta: Partial<ConsultaRuta> & Pick<ConsultaRuta, 'origen' | 'destino'>,
): RutaEncontrada {
  const resultado = calcularRuta(grafo, { criterio: 'mas-corta', ...consulta })
  if (resultado.tipo !== 'ruta')
    throw new Error(`se esperaba una ruta y salió ${JSON.stringify(resultado)}`)
  return resultado
}

/** Extremos del camino diagonal, para aceptar ese único tramo no ortogonal en la polilínea. */
const diagonal = (() => {
  const a = grafo.aristas[grafo.indiceArista.get(ARISTA_DIAGONAL)!]!
  return [grafo.nodos[a.a]!, grafo.nodos[a.b]!]
    .map((n) => `${n.x},${n.y}`)
    .sort()
    .join('|')
})()

/**
 * Verifica la forma del recorrido: nodos, aristas y polilínea coherentes y ortogonales (salvo el
 * camino diagonal).
 */
function verificarRecorrido(r: RutaEncontrada): void {
  expect(r.nodos[0]).toBe(r.puertaOrigen)
  expect(r.nodos.at(-1)).toBe(r.puertaDestino)
  expect(r.aristas).toHaveLength(r.nodos.length - 1)
  r.aristas.forEach((id, i) => {
    const a = grafo.aristas[grafo.indiceArista.get(id)!]!
    const extremos = [grafo.nodos[a.a]!.id, grafo.nodos[a.b]!.id].sort()
    expect(extremos).toEqual([r.nodos[i]!, r.nodos[i + 1]!].sort())
  })
  const inicio = grafo.nodos[grafo.indiceNodo.get(r.puertaOrigen)!]!
  const fin = grafo.nodos[grafo.indiceNodo.get(r.puertaDestino)!]!
  expect(r.polilinea[0]).toEqual([inicio.x, inicio.y])
  expect(r.polilinea.at(-1)).toEqual([fin.x, fin.y])
  for (let i = 1; i < r.polilinea.length; i++) {
    const [x0, y0] = r.polilinea[i - 1]!
    const [x1, y1] = r.polilinea[i]!
    expect(x0 === x1 && y0 === y1).toBe(false)
    const esDiagonal = [`${x0},${y0}`, `${x1},${y1}`].sort().join('|') === diagonal
    expect(x0 === x1 || y0 === y1 || esDiagonal).toBe(true)
  }
  expect(new Set(r.nodos).size).toBe(r.nodos.length)
}

describe('costos por criterio', () => {
  it('mas-corta = K·longitud + exterior; resguardada = interior + K·exterior', () => {
    const interior = grafo.aristas.find((a) => !a.exterior)!
    const exterior = grafo.aristas.find((a) => a.exterior)!
    expect(costoArista(interior, 'mas-corta')).toBe(K_COSTO * interior.longitud)
    expect(costoArista(exterior, 'mas-corta')).toBe(K_COSTO * exterior.longitud + exterior.longitud)
    expect(costoArista(interior, 'resguardada')).toBe(interior.longitud)
    expect(costoArista(exterior, 'resguardada')).toBe(K_COSTO * exterior.longitud)
  })
})

describe('casos reales', () => {
  it('Aula 121 → Aula 110: 481,11 px, sin exterior, 1 min', () => {
    const r = ruta({ origen: ['puerta-aula-121'], destino: ['puerta-aula-110'] })
    expect(r.distanciaPx).toBeCloseTo(481.11, 2)
    expect(r.exteriorPx).toBe(0)
    expect(r.exteriorM).toBe(0)
    expect(r.tiempoMin).toBe(1)
    const resguardada = ruta({
      ...r,
      origen: ['puerta-aula-121'],
      destino: ['puerta-aula-110'],
      criterio: 'resguardada',
    })
    expect(resguardada.nodos).toEqual(r.nodos)
    verificarRecorrido(r)
  })

  it('Aula 309 → Aula 103: la resguardada se desvía para reducir la vereda', () => {
    const consulta = { origen: ['puerta-aula-309'], destino: ['puerta-aula-103'] }
    const corta = ruta(consulta)
    expect(corta.distanciaPx).toBeCloseTo(2174.55, 2)
    expect(corta.exteriorPx).toBeCloseTo(1488, 2)
    expect(corta.tiempoMin).toBe(5)
    const resguardada = ruta({ ...consulta, criterio: 'resguardada' })
    expect(resguardada.criterio).toBe('resguardada')
    expect(resguardada.distanciaPx).toBeCloseTo(3202.07, 2)
    expect(resguardada.exteriorPx).toBeCloseTo(645, 2)
    expect(resguardada.distanciaM).toBeCloseTo(576.4, 1)
    expect(resguardada.exteriorM).toBeCloseTo(116, 0)
    expect(resguardada.tiempoMin).toBe(8)
    verificarRecorrido(corta)
    verificarRecorrido(resguardada)
  })

  it('Entrada Florencio Varela → Aula 121: resguardada coincide con la más corta (1106,57 px, 403,72 px afuera)', () => {
    const consulta = {
      origen: ['entrada-campus-florencio-varela'],
      destino: ['puerta-aula-121'],
    }
    const corta = ruta(consulta)
    const resguardada = ruta({ ...consulta, criterio: 'resguardada' })
    expect(corta.distanciaPx).toBeCloseTo(1106.57, 2)
    expect(corta.exteriorPx).toBeCloseTo(403.72, 2)
    expect(corta.exteriorM).toBeCloseTo(73, 0)
    expect(corta.distanciaM).toBeCloseTo(199, 0)
    expect(corta.tiempoMin).toBe(3)
    expect(resguardada.nodos).toEqual(corta.nodos)
  })

  it('Aula 121 → Lab. de Microscopía: 2070,73 px, ≈ 373 m, 5 min', () => {
    const consulta = { origen: ['puerta-aula-121'], destino: ['puerta-lab-microscopia'] }
    const r = ruta(consulta)
    expect(METROS_POR_PX).toBe(0.18)
    expect(grafo.metrosPorPx).toBe(METROS_POR_PX)
    expect(r.distanciaPx).toBeCloseTo(2070.73, 2)
    expect(r.distanciaM).toBeCloseTo(2070.73 * METROS_POR_PX, 1)
    expect(Math.round(r.distanciaM)).toBe(373)
    expect(r.tiempoSeg).toBe(Math.round((2070.73 * 0.18) / 1.2))
    expect(r.tiempoMin).toBe(5)
    expect(Math.round(r.exteriorM)).toBe(268)
    const resguardada = ruta({ ...consulta, criterio: 'resguardada' })
    expect(resguardada.distanciaPx).toBeCloseTo(5489.83, 2)
    expect(resguardada.tiempoMin).toBe(14)
    expect(resguardada.exteriorPx).toBeCloseTo(836, 2)
    expect(resguardada.exteriorM).toBeCloseTo(150.5, 1)
  })

  it('empate de 798 px Biblioteca (acceso oeste) → Auditorio Martí: elige el de menos exterior', () => {
    // Hay dos caminos de 798 px: uno con 724 px al aire libre y otro con 470 px.
    const r = ruta({ origen: ['acceso-biblioteca-oeste'], destino: ['puerta-auditorio-marti'] })
    expect(r.distanciaPx).toBeCloseTo(798, 2)
    expect(r.exteriorPx).toBeCloseTo(470, 2)
  })

  it('Aula 511 → Lab. de Microscopía es totalmente interior (944,37 px)', () => {
    const r = ruta({ origen: ['puerta-aula-511'], destino: ['puerta-lab-microscopia'] })
    expect(r.distanciaPx).toBeCloseTo(944.37, 2)
    expect(r.exteriorM).toBe(0)
    expect(r.nodos).toContain('cruce--este-hall-kinesiologia--este-pasillo-call-center')
  })

  it('Entrada Florencio Varela → Aula 101 toma el camino diagonal (458,47 px)', () => {
    const r = ruta({ origen: ['entrada-campus-florencio-varela'], destino: ['puerta-aula-101'] })
    expect(r.aristas).toContain(ARISTA_DIAGONAL)
    expect(r.distanciaPx).toBeCloseTo(458.47, 2)
    expect(r.exteriorPx).toBeCloseTo(403.72, 2)
    verificarRecorrido(r)
  })
})

describe('lugares con varias puertas', () => {
  it('llega al Gimnasio por el acceso sur (946,73 px) y lo informa', () => {
    const r = ruta({ origen: ['puerta-aula-121'], destino: [...GIMNASIO] })
    expect(r.puertaDestino).toBe('acceso-gimnasio-sur')
    expect(r.puertaOrigen).toBe('puerta-aula-121')
    expect(r.distanciaPx).toBeCloseTo(946.73, 2)
    verificarRecorrido(r)
  })

  it('sale por la puerta del Gimnasio más conveniente (multi-origen)', () => {
    const r = ruta({ origen: [...GIMNASIO], destino: ['puerta-aula-121'] })
    expect(r.puertaOrigen).toBe('acceso-gimnasio-sur')
    expect(r.distanciaPx).toBeCloseTo(946.73, 2)
  })
})

describe('tramos excluidos', () => {
  const CRUCE = 'cruce--este-hall-kinesiologia--este-pasillo-call-center'

  it('excluir el cruce del hall de Kinesiología desvía Aula 511 → Lab. de Microscopía a 1077,27 px', () => {
    const r = ruta({
      origen: ['puerta-aula-511'],
      destino: ['puerta-lab-microscopia'],
      excluidos: excluir([CRUCE]),
    })
    expect(r.nodos).not.toContain(CRUCE)
    expect(r.distanciaPx).toBeCloseTo(1077.27, 2)
    expect(Math.round(r.exteriorM)).toBe(65)
    verificarRecorrido(r)
  })

  it('excluir un nodo equivale a excluir todas sus aristas', () => {
    const nodo = grafo.nodos[grafo.indiceNodo.get(CRUCE)!]!
    const aristas = nodo.vecinos.map((v) => grafo.aristas[v.arista]!.id)
    const porAristas = ruta({
      origen: ['puerta-aula-511'],
      destino: ['puerta-lab-microscopia'],
      excluidos: excluir([], aristas),
    })
    expect(porAristas.distanciaPx).toBeCloseTo(1077.27, 2)
  })

  it('excluir una arista del recorrido obliga a evitarla', () => {
    const base = ruta({ origen: ['puerta-aula-121'], destino: ['puerta-aula-110'] })
    const prohibida = base.aristas[Math.floor(base.aristas.length / 2)]!
    const r = ruta({
      origen: ['puerta-aula-121'],
      destino: ['puerta-aula-110'],
      excluidos: excluir([], [prohibida]),
    })
    expect(r.aristas).not.toContain(prohibida)
    expect(r.distanciaPx).toBeGreaterThan(base.distanciaPx)
  })

  it('con el acceso sur del Gimnasio excluido entra por el norte', () => {
    const r = ruta({
      origen: ['puerta-aula-121'],
      destino: [...GIMNASIO],
      excluidos: excluir(['acceso-gimnasio-sur']),
    })
    expect(r.puertaDestino).toBe('acceso-gimnasio-norte')
    expect(r.nodos).not.toContain('acceso-gimnasio-sur')
    expect(r.distanciaPx).toBeCloseTo(1272.73, 2)
  })

  it('ignora ids de exclusión que no existen', () => {
    const r = ruta({
      origen: ['puerta-aula-121'],
      destino: ['puerta-aula-110'],
      excluidos: excluir(['nodo-que-no-existe'], ['arista__x__y']),
    })
    expect(r.distanciaPx).toBeCloseTo(481.11, 2)
  })
})

describe('resultados especiales', () => {
  afterEach(() => vi.restoreAllMocks())

  it('mismo lugar cuando origen y destino comparten una puerta', () => {
    const r = calcularRuta(grafo, {
      origen: ['puerta-aula-121'],
      destino: ['puerta-aula-121'],
      criterio: 'mas-corta',
    })
    expect(r).toEqual({
      tipo: 'mismo-lugar',
      nodo: 'puerta-aula-121',
      distanciaPx: 0,
      distanciaM: 0,
    })
  })

  it('sin camino cuando el patio de las aulas 250 queda aislado al excluir su salida', () => {
    for (const criterio of ['mas-corta', 'resguardada'] as const) {
      const r = calcularRuta(grafo, {
        origen: ['entrada-campus-florencio-varela'],
        destino: ['patio-aulas-250'],
        criterio,
        excluidos: excluir(['entrada-ed-oeste-patio-aulas-250']),
      })
      expect(r).toEqual({ tipo: 'sin-ruta', motivo: 'sin-camino' })
    }
  })

  it('destino sin puertas cuando los dos accesos del Gimnasio están excluidos', () => {
    const r = calcularRuta(grafo, {
      origen: ['puerta-aula-121'],
      destino: [...GIMNASIO],
      criterio: 'mas-corta',
      excluidos: excluir([...GIMNASIO]),
    })
    expect(r).toEqual({ tipo: 'sin-ruta', motivo: 'destino-sin-puertas' })
  })

  it('origen sin puertas cuando todas las de origen están excluidas o la lista está vacía', () => {
    const excluida = calcularRuta(grafo, {
      origen: [...GIMNASIO],
      destino: ['puerta-aula-121'],
      criterio: 'resguardada',
      excluidos: excluir([...GIMNASIO]),
    })
    expect(excluida).toEqual({ tipo: 'sin-ruta', motivo: 'origen-sin-puertas' })
    const vacia = calcularRuta(grafo, {
      origen: [],
      destino: ['puerta-aula-121'],
      criterio: 'mas-corta',
    })
    expect(vacia).toEqual({ tipo: 'sin-ruta', motivo: 'origen-sin-puertas' })
  })

  it('consulta inválida con los ids desconocidos (y lo registra en consola)', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const r: ResultadoRuta = calcularRuta(grafo, {
      origen: ['puerta-aula-999'],
      destino: ['puerta-aula-110', 'puerta-x'],
      criterio: 'mas-corta',
    })
    expect(r).toEqual({
      tipo: 'consulta-invalida',
      idsDesconocidos: ['puerta-aula-999', 'puerta-x'],
    })
    expect(aviso).toHaveBeenCalledOnce()
  })
})

describe('recorrido devuelto', () => {
  it('la distancia es la suma de las aristas y la polilínea mide lo mismo (también con la diagonal)', () => {
    for (const [origen, destino] of [
      ['puerta-aula-121', 'puerta-lab-microscopia'],
      ['entrada-campus-florencio-varela', 'puerta-aula-101'],
    ] as const) {
      const r = ruta({ origen: [origen], destino: [destino] })
      const suma = r.aristas.reduce(
        (s, id) => s + grafo.aristas[grafo.indiceArista.get(id)!]!.longitud,
        0,
      )
      expect(r.distanciaPx).toBe(suma / 100)
      let largo = 0
      for (let i = 1; i < r.polilinea.length; i++) {
        largo += Math.hypot(
          r.polilinea[i]![0] - r.polilinea[i - 1]![0],
          r.polilinea[i]![1] - r.polilinea[i - 1]![1],
        )
      }
      // La diagonal se redondea hacia arriba a la centésima: a lo sumo 0,01 px de diferencia.
      expect(Math.abs(largo - r.distanciaPx)).toBeLessThanOrEqual(0.01)
      verificarRecorrido(r)
    }
  })

  it('una ruta de menos de 30 s informa 1 min', () => {
    const r = ruta({
      origen: ['entrada-ed-sur-oeste-norte'],
      destino: ['cruce--ext-acceso-sur-oeste-norte--ext-vereda-oeste-edificio-sur'],
    })
    expect(r.tiempoSeg).toBeLessThan(30)
    expect(r.tiempoMin).toBe(1)
  })
})
