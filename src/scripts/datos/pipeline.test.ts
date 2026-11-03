import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { CatalogoLugares, GrafoCampus } from '../../src/datos/tipos.ts'
import { DIR_DATOS_FUENTE, RAIZ } from '../rutas-proyecto.ts'
import { prepararDatos } from './pipeline.ts'

const temporal = (prefijo: string) => mkdtempSync(join(tmpdir(), prefijo))
const opciones = (dirFuente: string, dirSalida: string) => ({
  dirFuente,
  dirSalida,
  mapaConPuntos: join(RAIZ, 'mapa-unlam.svg'),
  dirCache: temporal('cache-'),
  plano: false,
})
const leer = <T>(archivo: string) => JSON.parse(readFileSync(archivo, 'utf8')) as T

describe('pipeline (grafo y lugares)', () => {
  it('escribe grafo.json y lugares.json con las fuentes reales, con version estable', async () => {
    const salida = temporal('public-data-')
    const r1 = await prepararDatos(opciones(DIR_DATOS_FUENTE, salida))
    expect(r1.ok).toBe(true)
    const grafo = leer<GrafoCampus>(join(salida, 'grafo.json'))
    const lugares = leer<CatalogoLugares>(join(salida, 'lugares.json'))
    expect(Object.keys(grafo)).toEqual([
      'version',
      'metrosPorPx',
      'ancho',
      'alto',
      'nodos',
      'aristas',
    ])
    expect(grafo.nodos).toHaveLength(660)
    expect(grafo.aristas).toHaveLength(690)
    expect([grafo.ancho, grafo.alto, grafo.metrosPorPx]).toEqual([2810, 3745, 0.18])
    // Los nombres y categorías del plano van al catálogo, no al grafo.
    expect(Object.keys(grafo.nodos[0]!)).toEqual(['id', 'tipo', 'depto', 'x', 'y', 'piso'])
    expect(Object.keys(grafo.aristas[0]!)).toEqual(['id', 'a', 'b', 'px', 'm', 'exterior'])
    expect(lugares.lugares).toHaveLength(291)
    const ids = new Set(grafo.nodos.map((n) => n.id))
    expect(lugares.lugares.flatMap((l) => l.puertas).every((p) => ids.has(p))).toBe(true)

    const otraSalida = temporal('public-data-')
    await prepararDatos(opciones(DIR_DATOS_FUENTE, otraSalida))
    expect(leer<GrafoCampus>(join(otraSalida, 'grafo.json')).version).toBe(grafo.version)
    expect(leer<CatalogoLugares>(join(otraSalida, 'lugares.json')).version).toBe(lugares.version)
    expect(readFileSync(join(otraSalida, 'grafo.json'), 'utf8')).toBe(
      readFileSync(join(salida, 'grafo.json'), 'utf8'),
    )
  })

  it('un grafo con una arista en diagonal falla sin escribir datos', async () => {
    const fuente = temporal('datos-fuente-')
    cpSync(DIR_DATOS_FUENTE, fuente, { recursive: true })
    const g = leer<{ nodos: { id: string; x: number; y: number }[] }>(join(fuente, 'grafo.json'))
    const n = g.nodos.find((x) => x.id === 'pasillo-frente-aula-331')!
    n.x += 10
    n.y += 3
    writeFileSync(join(fuente, 'grafo.json'), JSON.stringify(g))
    const salida = temporal('public-data-')
    const r = await prepararDatos(opciones(fuente, salida))
    expect(r.ok).toBe(false)
    expect(r.problemas.filter((p) => p.tipo === 'arista-diagonal').length).toBeGreaterThan(0)
    expect(() => readFileSync(join(salida, 'grafo.json'))).toThrow()
  })

  it('el camino diagonal del plano pasa solo porque está en diagonalesPermitidas', async () => {
    const fuente = temporal('datos-fuente-')
    cpSync(DIR_DATOS_FUENTE, fuente, { recursive: true })
    const config = leer<Record<string, unknown>>(join(fuente, 'config.json'))
    delete config.diagonalesPermitidas
    writeFileSync(join(fuente, 'config.json'), JSON.stringify(config))
    const r = await prepararDatos(opciones(fuente, temporal('public-data-')))
    expect(r.ok).toBe(false)
    expect(r.problemas.filter((p) => p.tipo === 'arista-diagonal').map((p) => p.ids)).toEqual([
      ['arista__cruce-camino-diagonal-franja__cruce-camino-diagonal-vereda'],
    ])
  })
})
