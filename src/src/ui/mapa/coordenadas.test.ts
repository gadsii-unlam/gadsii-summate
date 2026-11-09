import { describe, expect, it } from 'vitest'
import grafo from '../../../public/data/grafo.json'
import svgPlano from '../../../public/data/mapa-base.svg?raw'
import { ORDEN_PANES, PANES } from './config.ts'
import { CRS_PLANO, aLatLng, aLatLngBounds } from './coordenadas.ts'

describe('coordenadas del plano', () => {
  const nodo = grafo.nodos.find((n) => n.id === 'puerta-aula-121')!

  it('un nodo de grafo.json cae en su píxel del plano (zoom 0 = 1:1)', () => {
    expect(nodo).toBeDefined()
    const p = CRS_PLANO.latLngToPoint(aLatLng(nodo), 0)
    expect(p.x).toBeCloseTo(nodo.x, 6)
    expect(p.y).toBeCloseTo(nodo.y, 6)
  })

  it('la y crece hacia abajo y el zoom 2 es la escala 4×', () => {
    const p = CRS_PLANO.latLngToPoint(aLatLng(nodo), 2)
    expect(p.x).toBeCloseTo(nodo.x * 4, 6)
    expect(p.y).toBeCloseTo(nodo.y * 4, 6)
    const arriba = CRS_PLANO.latLngToPoint(aLatLng({ x: 0, y: 0 }), 0)
    const abajo = CRS_PLANO.latLngToPoint(aLatLng({ x: 0, y: grafo.alto }), 0)
    expect(abajo.y).toBeGreaterThan(arriba.y)
  })

  it('el SVG del plano mide lo mismo que el grafo: 1 unidad del SVG = 1 px del plano', () => {
    const raiz = /<svg [^>]*>/.exec(svgPlano)?.[0] ?? ''
    expect(raiz).toContain(`viewBox="0 0 ${grafo.ancho} ${grafo.alto}"`)
  })

  it('las cajas se convierten en límites [y, x]', () => {
    const b = aLatLngBounds({ x1: 10, y1: 20, x2: 30, y2: 40 })
    expect(b.getSouthWest().lat).toBe(20)
    expect(b.getNorthEast().lng).toBe(30)
  })
})

describe('panes', () => {
  it('se apilan plano < cierres < ruta < marcadores', () => {
    const z = ORDEN_PANES.map((n) => PANES[n].zIndex)
    expect([...z].sort((a, b) => a - b)).toEqual(z)
    expect(new Set(z).size).toBe(z.length)
    // Por encima del tilePane (200) y debajo del popupPane (700) de Leaflet.
    expect(Math.min(...z)).toBeGreaterThan(200)
    expect(Math.max(...z)).toBeLessThan(700)
  })
})
