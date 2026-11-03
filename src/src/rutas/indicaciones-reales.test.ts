/**
 * Indicaciones con el grafo y el catálogo reales: test de referencia (design.md, decisión 13),
 * casos de los specs y propiedades sobre una muestra de pares de puertas.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import catalogoJson from '../../public/data/lugares.json'
import type { CatalogoLugares, Lugar } from '../datos/index.ts'
import { calcularRuta } from './astar.ts'
import { NOMBRES_ENTRADAS } from './entradas.ts'
import {
  generarIndicaciones,
  prepararDatosIndicaciones,
  type NombresEntradas,
  type Paso,
} from './indicaciones.ts'
import { crearAleatorio, mezclar } from './test/aleatorio.ts'
import { GRAFO_CAMPUS, grafoReal, puertas } from './test/datos-reales.ts'
import type { Criterio, RutaEncontrada } from './tipos.ts'

const CATALOGO = catalogoJson as CatalogoLugares
const grafo = grafoReal()
const porId = new Map(CATALOGO.lugares.map((l) => [l.id, l]))
const lugarDe = (id: string): Lugar => {
  const l = porId.get(id)
  if (!l) throw new Error(`no está el lugar ${id}`)
  return l
}
/** Lugar de una puerta (para la muestra al azar). */
const porPuerta = new Map(CATALOGO.lugares.flatMap((l) => l.puertas.map((p) => [p, l] as const)))

const datosCon = (entradas: NombresEntradas = NOMBRES_ENTRADAS) =>
  prepararDatosIndicaciones({ grafo, nodos: GRAFO_CAMPUS.nodos, catalogo: CATALOGO, entradas })
const DATOS = datosCon()
const tipos = new Map(GRAFO_CAMPUS.nodos.map((n) => [n.id, n.tipo]))

function ruta(origen: string[], destino: string[], criterio: Criterio): RutaEncontrada {
  const r = calcularRuta(grafo, { origen, destino, criterio })
  if (r.tipo !== 'ruta') throw new Error(`sin ruta: ${r.tipo}`)
  return r
}

function indicaciones(
  origenId: string,
  destinoId: string,
  criterio: Criterio = 'mas-corta',
  datos = DATOS,
) {
  const origen = lugarDe(origenId)
  const destino = lugarDe(destinoId)
  const r = ruta(origen.puertas, destino.puertas, criterio)
  return { ruta: r, pasos: generarIndicaciones(r, datos, { origen, destino }) }
}

const tabla = (pasos: Paso[]) =>
  pasos.map((p) => [p.texto, p.distanciaM ?? null, p.alAireLibre] as const)

afterEach(() => {
  vi.restoreAllMocks()
})

describe('test de referencia: Dirección de Alumnos → Dpto. de Cs. de la Salud', () => {
  // Los dos están en edificios distintos: la más corta cruza la franja entre edificios por el hall
  // de los auditorios y el de Kinesiología; la resguardada va por los pasillos norte.
  it('ruta más corta: 8 pasos, textos, distancias y "Al aire libre"', () => {
    const { ruta: r, pasos } = indicaciones('direccion-alumnos', 'dpto-cs-salud')
    expect(r.distanciaM).toBeCloseTo(123.4, 1)
    expect(tabla(pasos)).toEqual([
      ['Salí de Dirección de Alumnos y doblá a la izquierda', 35, false],
      [
        'Seguí derecho y salí del Edificio Oeste por la entrada este del hall de los auditorios',
        5,
        true,
      ],
      ['Doblá a la izquierda', 10, true],
      ['Doblá a la derecha', 15, true],
      ['Doblá a la izquierda', 15, true],
      ['Doblá a la derecha', 15, true],
      ['Entrá al Edificio Este por la entrada del hall de Kinesiología', 10, false],
      ['Doblá a la izquierda: llegaste a Dpto. de Cs. de la Salud', null, false],
    ])
    // Nodo de cada maniobra.
    expect(pasos.slice(1).map((p) => r.nodos[p.tramo.desde])).toEqual([
      'entrada-ed-oeste-auditorios-lado-este',
      'cruce--ext-acceso-oeste-auditorios-este--ext-franja-entre-edificios-oeste',
      'cruce--ext-cruce-franjas-1773--ext-franja-entre-edificios-oeste',
      'cruce--ext-cruce-franjas-1773--ext-franja-entre-edificios-este',
      'cruce--ext-acceso-este-kinesiologia--ext-franja-entre-edificios-este',
      'entrada-ed-este-kinesiologia',
      'pasillo-frente-dpto-cs-salud',
    ])
  })

  it('ruta resguardada: 8 pasos, cruza por los pasillos norte con un solo tramo al aire libre', () => {
    const { ruta: r, pasos } = indicaciones('direccion-alumnos', 'dpto-cs-salud', 'resguardada')
    expect(r.distanciaM).toBeCloseTo(327.6, 1)
    expect(tabla(pasos)).toEqual([
      ['Salí de Dirección de Alumnos y doblá a la izquierda', 15, false],
      ['Doblá a la izquierda', 105, false],
      ['Doblá a la derecha', 20, false],
      ['Seguí derecho y salí del Edificio Oeste por la entrada este del pasillo norte', 35, true],
      ['Entrá al Edificio Este por la entrada oeste del pasillo norte', 35, false],
      ['Doblá a la derecha', 80, false],
      ['Doblá a la derecha', 20, false],
      ['Doblá a la derecha: llegaste a Dpto. de Cs. de la Salud', null, false],
    ])
    expect(pasos.filter((p) => p.alAireLibre)).toHaveLength(1)
  })
})

describe('casos de los specs con el grafo real', () => {
  it('un pasillo recto con muchos nodos (309 a 325) es un solo paso de 105 m', () => {
    const { ruta: r, pasos } = indicaciones('direccion-alumnos', 'dpto-cs-salud', 'resguardada')
    const desde = r.nodos.indexOf('cruce--oeste-hall-auditorios--oeste-pasillo-309-325')
    const hasta = r.nodos.indexOf('cruce--oeste-pasillo-norte-326-335--oeste-pasillo-309-325')
    expect(hasta - desde).toBeGreaterThan(10)
    const dentro = pasos.filter((p) => p.tramo.desde > desde && p.tramo.desde < hasta)
    expect(dentro).toEqual([])
    expect(pasos[1]!.distanciaM).toBe(105)
  })

  // El desvío de menos de 3 m que no genera giros ya no se da en el grafo real (ninguna ruta entre
  // lugares tiene uno): lo cubre el caso sintético de indicaciones.test.ts.

  it('una entrada sin nombre cargado no se menciona: "Entrá al Edificio Este"', () => {
    const { ruta: r, pasos } = indicaciones('biblioteca', 'aula-401', 'mas-corta', datosCon({}))
    expect(r.nodos).toContain('entrada-ed-este-400-500-lado-oeste')
    const entrar = pasos.find((p) => p.tipo === 'entrar-edificio')!
    expect(entrar.texto).toBe('Entrá al Edificio Este')
    expect(r.nodos[entrar.tramo.desde]).toBe('entrada-ed-este-400-500-lado-oeste')
  })

  it('con el nombre cargado sí se menciona', () => {
    const { pasos } = indicaciones('biblioteca', 'aula-401')
    expect(pasos.find((p) => p.tipo === 'entrar-edificio')!.texto).toBe(
      'Entrá al Edificio Este por la entrada oeste del pasillo 400/500',
    )
  })

  it('el primer paso desde una puerta que da a la vereda: "Salí de Biblioteca… a la vereda"', () => {
    const { pasos } = indicaciones('biblioteca', 'aula-401')
    expect(pasos[0]!.tipo).toBe('salir-lugar')
    expect(pasos[0]!.texto).toMatch(/^Salí de Biblioteca Leopoldo Marechal a la vereda/)
    expect(pasos[0]!.alAireLibre).toBe(true)
  })

  it('desde una entrada al campus: "Desde Entrada Florencio Varela, seguí la línea azul N m"', () => {
    const { pasos } = indicaciones('entrada-campus-florencio-varela', 'aula-121')
    const primero = pasos[0]!
    expect(primero.texto).toBe(
      `Desde Entrada Florencio Varela, seguí la línea azul ${primero.distanciaM} m`,
    )
    expect(primero.distanciaEnTexto).toBe(true)
  })

  it('llegada a una puerta que da a la vereda: "Llegaste a Gimnasio J.M. Fangio"', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { pasos } = indicaciones('aula-121', 'gimnasio')
    expect(pasos.at(-1)!.texto).toBe('Llegaste a Gimnasio J.M. Fangio')
  })

  it('Aula 121 → Aula 110: todo bajo techo, ningún paso al aire libre ni de piso', () => {
    const { pasos } = indicaciones('aula-121', 'aula-110')
    expect(pasos.some((p) => p.alAireLibre)).toBe(false)
    expect(pasos.some((p) => p.tipo === 'piso' || p.tipo === 'escalera')).toBe(false)
  })
})

describe('propiedades sobre 500 pares de puertas al azar (semilla fija)', () => {
  it('generan indicaciones sin errores, empiezan saliendo, terminan llegando y suman bien', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const aleatorio = crearAleatorio(20261022)
    const todas = puertas(grafo)
    const pares: [string, string][] = []
    while (pares.length < 500) {
      const [a, b] = mezclar(todas, aleatorio)
      if (a && b && porPuerta.has(a) && porPuerta.has(b) && porPuerta.get(a) !== porPuerta.get(b))
        pares.push([a, b])
    }
    const inicio = performance.now()
    let rutas = 0
    for (const [a, b] of pares) {
      for (const criterio of ['mas-corta', 'resguardada'] as const) {
        const r = calcularRuta(grafo, { origen: [a], destino: [b], criterio })
        if (r.tipo !== 'ruta') continue
        rutas++
        const pasos = generarIndicaciones(r, DATOS, {
          origen: porPuerta.get(a)!,
          destino: porPuerta.get(b)!,
        })
        expect(pasos.length).toBeGreaterThanOrEqual(2)
        expect(pasos[0]!.tipo).toBe('salir-lugar')
        expect(['llegar', 'piso']).toContain(pasos.at(-1)!.tipo)
        for (const p of pasos) {
          expect(p.texto.length).toBeGreaterThan(0)
          expect(p.texto).not.toMatch(/undefined|null|NaN/)
          expect(p.tramo.desde).toBeLessThanOrEqual(p.tramo.hasta)
          expect(p.tramo.hasta).toBeLessThan(r.nodos.length)
        }
        // Los tramos puerta → pasillo de la salida y de la llegada no tienen distancia propia
        // (el design.md cuenta "30 m" desde el pasillo), así que se descuentan del total.
        const suma = pasos.reduce((s, p) => s + (p.distanciaM ?? 0), 0)
        const puertasM = [r.aristas[0]!, r.aristas.at(-1)!]
          .filter((_, i) => tipos.get(i === 0 ? r.nodos[0]! : r.nodos.at(-1)!) === 'puerta')
          .reduce((s, id) => s + grafo.aristas[grafo.indiceArista.get(id)!]!.longitud / 100, 0)
        const cuerpoM = r.distanciaM - puertasM * grafo.metrosPorPx
        expect(Math.abs(suma - cuerpoM)).toBeLessThan(5 * pasos.length)
      }
    }
    const ms = performance.now() - inicio
    expect(rutas).toBeGreaterThan(900)
    expect(ms).toBeLessThan(2000)
    // Si una ruta vuelve sobre sus pasos, se registra (no debería pasar en una ruta óptima).
    for (const llamada of aviso.mock.calls) expect(String(llamada[0])).toContain('vuelve sobre')
  })
})
