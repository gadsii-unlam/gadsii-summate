import { describe, expect, it } from 'vitest'
import type { GrafoFuente, NodoFuente } from './fuentes.ts'
import { leerConfig, leerCurados, leerGrafoFuente } from './fuentes.ts'
import { enriquecerGrafo, leerEstructura, longitudPx, metros, validarGrafo } from './grafo.ts'
import { errores, type Problema } from './problemas.ts'

const nodo = (id: string, x: number, y: number, depto = 'salud'): NodoFuente => ({
  id,
  tipo: id.startsWith('puerta') ? 'puerta' : id.startsWith('entrada') ? 'entrada' : 'pasillo',
  depto,
  x,
  y,
})
const arista = (a: string, b: string) => ({ id: `arista__${a}__${b}`, a, b })

/** Pasillo en L: 01 (0,0) — 02 (100,0) — 03 (100,50). */
const base = (): GrafoFuente => ({
  ancho: 200,
  alto: 200,
  nodos: [
    nodo('pasillo-salud-01', 0, 0),
    nodo('pasillo-salud-02', 100, 0),
    nodo('pasillo-salud-03', 100, 50),
  ],
  aristas: [
    arista('pasillo-salud-01', 'pasillo-salud-02'),
    arista('pasillo-salud-02', 'pasillo-salud-03'),
  ],
})

const tipos = (ps: Problema[]) => errores(ps).map((p) => p.tipo)
const idsDe = (ps: Problema[], tipo: string) =>
  errores(ps)
    .filter((p) => p.tipo === tipo)
    .flatMap((p) => p.ids ?? [])

describe('validarGrafo', () => {
  it('acepta un grafo conexo y ortogonal', () => {
    expect(errores(validarGrafo(base(), 0.6))).toEqual([])
  })

  it('rechaza un id de nodo repetido nombrándolo', () => {
    const g = base()
    g.nodos.push(nodo('pasillo-salud-02', 300, 0))
    expect(idsDe(validarGrafo(g, 0.6), 'nodo-repetido')).toEqual(['pasillo-salud-02'])
  })

  it('rechaza un id de arista repetido', () => {
    const g = base()
    g.aristas.push({
      ...arista('pasillo-salud-01', 'pasillo-salud-03'),
      id: 'arista__pasillo-salud-01__pasillo-salud-02',
    })
    expect(idsDe(validarGrafo(g, 0.6), 'arista-repetida')).toEqual([
      'arista__pasillo-salud-01__pasillo-salud-02',
    ])
  })

  it('rechaza una arista hacia un nodo inexistente nombrando la arista y el nodo', () => {
    const g = base()
    g.aristas.push(arista('pasillo-salud-03', 'pasillo-salud-99'))
    const ps = validarGrafo(g, 0.6)
    expect(idsDe(ps, 'arista-extremo-inexistente')).toEqual([
      'arista__pasillo-salud-03__pasillo-salud-99',
      'pasillo-salud-99',
    ])
    expect(errores(ps)[0]?.mensaje).toContain('pasillo-salud-99')
  })

  it('rechaza bucles y aristas repetidas entre los mismos nodos', () => {
    const g = base()
    g.aristas.push(arista('pasillo-salud-03', 'pasillo-salud-03'))
    g.aristas.push(arista('pasillo-salud-02', 'pasillo-salud-01'))
    const ps = validarGrafo(g, 0.6)
    expect(idsDe(ps, 'arista-bucle')).toEqual(['arista__pasillo-salud-03__pasillo-salud-03'])
    expect(idsDe(ps, 'arista-duplicada')).toEqual([
      'arista__pasillo-salud-01__pasillo-salud-02',
      'arista__pasillo-salud-02__pasillo-salud-01',
    ])
  })

  it('rechaza un componente separado nombrando sus nodos', () => {
    const g = base()
    g.nodos.push(nodo('pasillo-salud-10', 0, 150), nodo('pasillo-salud-11', 40, 150))
    g.aristas.push(arista('pasillo-salud-10', 'pasillo-salud-11'))
    const ps = validarGrafo(g, 0.6)
    expect(tipos(ps)).toEqual(['grafo-no-conexo'])
    expect(idsDe(ps, 'grafo-no-conexo')).toEqual(['pasillo-salud-10', 'pasillo-salud-11'])
  })

  it('rechaza un nodo sin aristas nombrándolo (y no lo cuenta dos veces como componente)', () => {
    const g = base()
    g.nodos.push(nodo('pasillo-salud-20', 10, 10))
    const ps = validarGrafo(g, 0.6)
    expect(tipos(ps)).toEqual(['nodo-aislado'])
    expect(idsDe(ps, 'nodo-aislado')).toEqual(['pasillo-salud-20'])
  })

  it('rechaza una arista en diagonal (10 px en x y 3 px en y) con su id', () => {
    const g = base()
    g.nodos.push(nodo('pasillo-salud-04', 110, 53))
    g.aristas.push(arista('pasillo-salud-03', 'pasillo-salud-04'))
    expect(idsDe(validarGrafo(g, 0.6), 'arista-diagonal')).toEqual([
      'arista__pasillo-salud-03__pasillo-salud-04',
    ])
  })

  it('acepta una diagonal si está en diagonalesPermitidas (y solo esa)', () => {
    const g = base()
    g.nodos.push(nodo('pasillo-salud-04', 130, 90), nodo('pasillo-salud-05', 160, 130))
    g.aristas.push(
      arista('pasillo-salud-03', 'pasillo-salud-04'),
      arista('pasillo-salud-04', 'pasillo-salud-05'),
    )
    const ps = validarGrafo(g, 0.6, ['arista__pasillo-salud-03__pasillo-salud-04'])
    expect(idsDe(ps, 'arista-diagonal')).toEqual(['arista__pasillo-salud-04__pasillo-salud-05'])
    expect(errores(ps)[0]?.mensaje).toContain('diagonalesPermitidas')
    expect(ps.filter((p) => p.severidad === 'aviso')).toEqual([])
  })

  it('avisa si una diagonal permitida es recta o no existe', () => {
    const ps = validarGrafo(base(), 0.6, [
      'arista__pasillo-salud-01__pasillo-salud-02',
      'arista__no__existe',
    ])
    expect(errores(ps)).toEqual([])
    expect(ps.map((p) => [p.tipo, p.ids])).toEqual([
      ['diagonal-permitida-recta', ['arista__pasillo-salud-01__pasillo-salud-02']],
      ['diagonal-permitida-sin-arista', ['arista__no__existe']],
    ])
  })

  it('avisa (sin error) nodos en la misma posición y aristas de longitud 0', () => {
    const g = base()
    g.nodos.push(nodo('pasillo-salud-04', 100, 50))
    g.aristas.push(arista('pasillo-salud-03', 'pasillo-salud-04'))
    const ps = validarGrafo(g, 0.6)
    expect(errores(ps)).toEqual([])
    expect(ps.map((p) => [p.tipo, p.ids])).toEqual([
      ['arista-longitud-cero', ['arista__pasillo-salud-03__pasillo-salud-04']],
      ['nodos-misma-posicion', ['pasillo-salud-03', 'pasillo-salud-04']],
    ])
  })

  it('acepta como recta una arista con 0,5 px de desfase en 40 px', () => {
    const g = base()
    g.nodos.push(nodo('pasillo-salud-04', 140, 50.5))
    g.aristas.push(arista('pasillo-salud-03', 'pasillo-salud-04'))
    expect(errores(validarGrafo(g, 0.6))).toEqual([])
  })

  it('reporta todos los problemas juntos', () => {
    const g = base()
    g.nodos.push(
      nodo('pasillo-salud-02', 300, 0),
      nodo('pasillo-salud-20', 10, 10),
      nodo('pasillo-salud-04', 110, 53),
    )
    g.aristas.push(
      arista('pasillo-salud-03', 'pasillo-salud-04'),
      arista('pasillo-salud-03', 'pasillo-salud-99'),
    )
    expect(new Set(tipos(validarGrafo(g, 0.6)))).toEqual(
      new Set(['nodo-repetido', 'arista-extremo-inexistente', 'nodo-aislado', 'arista-diagonal']),
    )
  })

  it('avisa (sin error) peso distinto, id con otro formato y puerta con varias aristas', () => {
    const g = base()
    g.nodos.push(nodo('puerta-salud-101', 0, 50))
    g.aristas.push({ id: 'otra-cosa', a: 'puerta-salud-101', b: 'pasillo-salud-01', peso: 50.3 })
    g.aristas.push(arista('puerta-salud-101', 'pasillo-salud-03'))
    const ps = validarGrafo(g, 0.6)
    expect(errores(ps)).toEqual([])
    expect(ps.map((p) => p.tipo).sort()).toEqual([
      'arista-id-formato',
      'arista-peso-distinto',
      'puerta-varias-aristas',
    ])
  })

  it('rechaza un grafo sin la forma esperada', () => {
    expect(leerEstructura({ nodos: [] }).grafo).toBeNull()
    expect(
      leerEstructura({
        ancho: 1,
        alto: 1,
        nodos: [{ id: 'x', tipo: 'otro', depto: 'a', x: 0, y: 0 }],
        aristas: [],
      }).problemas[0]?.tipo,
    ).toBe('grafo-formato')
  })

  it('valida los campos opcionales piso, nombre, categoria y exterior', () => {
    const conCampos = (n: Record<string, unknown>, a: Record<string, unknown> = {}) =>
      leerEstructura({
        ancho: 1,
        alto: 1,
        nodos: [{ id: 'x', tipo: 'puerta', depto: 'a', x: 0, y: 0, ...n }],
        aristas: [{ id: 'arista__x__x', a: 'x', b: 'x', ...a }],
      })
    const bien = conCampos({ piso: 1, nombre: 'Aula 1', categoria: 'aula' }, { exterior: true })
    expect(bien.problemas).toEqual([])
    expect(bien.grafo?.nodos[0]).toMatchObject({ piso: 1, nombre: 'Aula 1', categoria: 'aula' })
    for (const [n, a] of [
      [{ piso: -1 }, {}],
      [{ piso: 1.5 }, {}],
      [{ nombre: '' }, {}],
      [{ categoria: 'patio' }, {}],
      [{}, { exterior: 'si' }],
    ] as const) {
      const r = conCampos(n, a)
      expect(r.grafo).toBeNull()
      expect(r.problemas.map((p) => p.tipo)).toEqual(['grafo-formato'])
    }
  })
})

describe('longitud y metros', () => {
  it('una arista de (100, 200) a (160, 200) mide 60 px', () => {
    expect(longitudPx({ x: 100, y: 200 }, { x: 160, y: 200 })).toBe(60)
  })

  it('una diagonal mide la distancia euclídea, redondeada a 0,01 px', () => {
    expect(longitudPx({ x: 0, y: 0 }, { x: 30, y: 40 })).toBe(50)
    expect(longitudPx({ x: 838, y: 3482 }, { x: 1033, y: 3355 })).toBe(232.71)
  })

  it('100 px son 35 m con 0,35 m/px y 30 m con 0,30 m/px', () => {
    expect(metros(100, 0.35)).toBe(35)
    expect(metros(100, 0.3)).toBe(30)
  })

  it('el grafo generado recalcula px, guarda el factor y no conserva el peso exportado', () => {
    const g = base()
    g.aristas[0] = { ...g.aristas[0]!, peso: 99.9 }
    g.nodos[2] = { ...g.nodos[2]!, piso: 1, nombre: 'no viaja', categoria: 'aula' }
    const { grafo } = enriquecerGrafo(g, 0.3)
    expect(grafo.metrosPorPx).toBe(0.3)
    expect(grafo.nodos.map((n) => n.piso)).toEqual([0, 0, 1])
    expect(grafo.nodos[2]).toEqual({
      id: 'pasillo-salud-03',
      tipo: 'pasillo',
      depto: 'salud',
      x: 100,
      y: 50,
      piso: 1,
    })
    expect(grafo.aristas[0]).toEqual({
      id: 'arista__pasillo-salud-01__pasillo-salud-02',
      a: 'pasillo-salud-01',
      b: 'pasillo-salud-02',
      px: 100,
      m: 30,
      exterior: false,
    })
    expect(grafo).not.toHaveProperty('adyacencia')
  })

  it('avisa si el peso exportado difiere más de 0,1 px de la longitud geométrica', () => {
    const g = base()
    g.aristas[0] = { ...g.aristas[0]!, peso: 100.2 }
    expect(validarGrafo(g, 0.6).map((p) => p.tipo)).toEqual(['arista-peso-distinto'])
    g.aristas[0] = { ...g.aristas[0]!, peso: 100.05 }
    expect(validarGrafo(g, 0.6)).toEqual([])
  })
})

describe('exterior', () => {
  it('es exterior si toca un nodo de la red de veredas, con excepciones forzadas', () => {
    const g = base()
    g.nodos.push(nodo('pasillo-central-01', 100, 80, 'central'))
    g.aristas.push(arista('pasillo-salud-03', 'pasillo-central-01'))
    const normal = enriquecerGrafo(g, 0.35).grafo.aristas.map((a) => a.exterior)
    expect(normal).toEqual([false, false, true])
    const forzado = enriquecerGrafo(g, 0.35, {
      'arista__pasillo-salud-03__pasillo-central-01': false,
      'arista__pasillo-salud-01__pasillo-salud-02': true,
      arista__no__existe: true,
    })
    expect(forzado.grafo.aristas.map((a) => a.exterior)).toEqual([true, false, false])
    expect(forzado.problemas.map((p) => p.tipo)).toEqual(['exterior-forzado-sin-arista'])
  })

  it('lo que dice el plano (exterior de la fuente) pisa la regla, y la excepción curada pisa al plano', () => {
    const g = base()
    g.nodos.push(nodo('pasillo-central-01', 100, 80, 'central'))
    g.aristas.push({ ...arista('pasillo-salud-03', 'pasillo-central-01'), exterior: false })
    g.aristas[0] = { ...g.aristas[0]!, exterior: true }
    expect(enriquecerGrafo(g, 0.35).grafo.aristas.map((a) => a.exterior)).toEqual([
      true,
      false,
      false,
    ])
    const forzado = enriquecerGrafo(g, 0.35, {
      'arista__pasillo-salud-01__pasillo-salud-02': false,
    })
    expect(forzado.grafo.aristas.map((a) => a.exterior)).toEqual([false, false, false])
  })
})

describe('con el grafo real', () => {
  const config = leerConfig()
  const curados = leerCurados()
  const fuente = leerEstructura(leerGrafoFuente()).grafo as GrafoFuente
  const problemas = validarGrafo(fuente, config.toleranciaOrtogonalPx, config.diagonalesPermitidas)
  const { grafo } = enriquecerGrafo(fuente, config.metrosPorPx, curados.exteriorForzado)
  const aristaEntre = (a: string, b: string) =>
    grafo.aristas.find((x) => (x.a === a && x.b === b) || (x.a === b && x.b === a))

  it('valida sin errores ni avisos', () => {
    expect(problemas).toEqual([])
  })

  it('tiene 660 nodos (291 puertas, 348 pasillos, 21 entradas; 25 en el 1er piso) y 690 aristas', () => {
    expect(grafo.nodos).toHaveLength(660)
    expect(grafo.aristas).toHaveLength(690)
    const cuenta = (t: string) => grafo.nodos.filter((n) => n.tipo === t).length
    expect([cuenta('puerta'), cuenta('pasillo'), cuenta('entrada')]).toEqual([291, 348, 21])
    expect(grafo.nodos.filter((n) => n.piso === 1)).toHaveLength(25)
    expect(grafo.nodos.find((n) => n.id === 'entrada-campus-florencio-varela')).toEqual({
      id: 'entrada-campus-florencio-varela',
      tipo: 'entrada',
      depto: 'central',
      x: 838,
      y: 3605,
      piso: 0,
    })
  })

  it('tiene 113 aristas exteriores y 577 interiores, como las agrupa el plano', () => {
    expect(grafo.aristas.filter((a) => a.exterior)).toHaveLength(113)
    expect(grafo.aristas.filter((a) => !a.exterior)).toHaveLength(577)
    const sur = 'entrada-ed-sur-norte'
    expect(aristaEntre(sur, 'cruce--ext-plaza-sur-gimnasio--ext-acceso-sur-norte')?.exterior).toBe(
      true,
    )
    expect(
      aristaEntre(sur, 'cruce--sur-pasillo-norte-108-119--sur-pasillo-131-134')?.exterior,
    ).toBe(false)
    // Los baños del natatorio dan al exterior, pero el plano dibuja su tramo como interior.
    const natatorio = 'pasillo-frente-bano-hombres-natatorio-y-bano-mujeres-natatorio'
    expect(aristaEntre('puerta-bano-hombres-natatorio', natatorio)?.exterior).toBe(false)
    expect(aristaEntre('escalera-radio-planta-baja', 'escalera-radio-primer-piso')?.exterior).toBe(
      true,
    )
  })

  it('px nunca es menor que la distancia euclídea y coincide con el peso del plano', () => {
    const nodos = new Map(grafo.nodos.map((n) => [n.id, n]))
    for (const a of grafo.aristas) {
      const na = nodos.get(a.a)!
      const nb = nodos.get(a.b)!
      expect(a.px).toBeGreaterThanOrEqual(Math.hypot(na.x - nb.x, na.y - nb.y) - 0.005)
    }
    for (const a of fuente.aristas) {
      const px = grafo.aristas.find((x) => x.id === a.id)!.px
      expect(Math.abs((a.peso ?? px) - px)).toBeLessThanOrEqual(0.05 + 1e-9)
    }
  })

  it('la única diagonal es el camino diagonal al Edificio Sur', () => {
    const nodos = new Map(grafo.nodos.map((n) => [n.id, n]))
    const diagonales = grafo.aristas.filter((a) => {
      const na = nodos.get(a.a)!
      const nb = nodos.get(a.b)!
      return Math.abs(na.x - nb.x) > 0.6 && Math.abs(na.y - nb.y) > 0.6
    })
    expect(diagonales.map((a) => [a.id, a.px])).toEqual([
      ['arista__cruce-camino-diagonal-franja__cruce-camino-diagonal-vereda', 232.71],
    ])
    expect(config.diagonalesPermitidas).toEqual([diagonales[0]!.id])
  })

  it('la version no cambia si se arma dos veces con las mismas fuentes', () => {
    const otra = enriquecerGrafo(
      leerEstructura(leerGrafoFuente()).grafo as GrafoFuente,
      config.metrosPorPx,
      curados.exteriorForzado,
    )
    expect(otra.grafo.version).toBe(grafo.version)
    expect(enriquecerGrafo(fuente, 0.3).grafo.version).not.toBe(grafo.version)
  })
})
