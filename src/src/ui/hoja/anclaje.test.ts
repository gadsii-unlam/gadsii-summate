// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { alturaSiguiente, calcularAnclajes, elegirAnclaje } from './anclaje.ts'
import type { Altura } from './anclaje.ts'

// 390 × 844 con insets 47/34 y la tarjeta de 48 px + 8 px de margen.
const A = { colapsada: 130, media: 422, expandida: 730 }

describe('elegirAnclaje', () => {
  const casos: Array<[string, number, number, Altura]> = [
    ['soltar quieto cerca de colapsada', 150, 0, 'colapsada'],
    ['soltar quieto un poco más arriba de la mitad hacia media', 290, 0, 'media'],
    ['soltar quieto un poco más abajo de la mitad hacia media', 260, 0, 'colapsada'],
    ['soltar quieto cerca de media', 430, 0, 'media'],
    ['soltar quieto cerca de expandida', 700, 0, 'expandida'],
    ['soltar despacio hacia arriba que proyecta a media', 250, 0.3, 'media'],
    ['deslizamiento rápido hacia arriba desde media con poco recorrido', 440, 0.8, 'expandida'],
    ['deslizamiento rápido hacia abajo desde media con poco recorrido', 410, -0.8, 'colapsada'],
    ['deslizamiento rápido hacia arriba desde colapsada', 140, 0.6, 'media'],
    ['deslizamiento muy rápido desde colapsada llega a expandida', 140, 3, 'expandida'],
    ['deslizamiento rápido hacia arriba en expandida se queda', 730, 1, 'expandida'],
    ['deslizamiento rápido hacia abajo en colapsada se queda', 130, -1, 'colapsada'],
    ['justo en el umbral (0,5) no fuerza el avance', 430, 0.5, 'media'],
  ]
  it.each(casos)('%s', (_, posicion, velocidad, esperado) => {
    expect(elegirAnclaje(posicion, velocidad, A)).toBe(esperado)
  })
})

describe('alturaSiguiente', () => {
  it('flechas suben y bajan una altura sin pasarse', () => {
    expect(alturaSiguiente('colapsada', 1)).toBe('media')
    expect(alturaSiguiente('expandida', 1)).toBe('expandida')
    expect(alturaSiguiente('colapsada', -1)).toBe('colapsada')
  })
  it('Enter da la vuelta', () => {
    expect(alturaSiguiente('expandida', 1, true)).toBe('colapsada')
  })
})

describe('calcularAnclajes', () => {
  it('reproduce los valores de design.md para 390 × 844 (iPhone 47/34)', () => {
    const a = calcularAnclajes(844, 64, 47, 34)
    expect(a.colapsada).toBe(130)
    expect(a.media).toBe(422)
    expect(a.expandida).toBeCloseTo(717, -1)
  })
  it('con un contenido corto, la altura media se ajusta a ese contenido', () => {
    expect(calcularAnclajes(844, 64, 47, 34, 260).media).toBe(260)
    // Nunca más alta que la mitad de la pantalla ni más baja que la colapsada.
    expect(calcularAnclajes(844, 64, 47, 34, 900).media).toBe(422)
    expect(calcularAnclajes(844, 64, 47, 34, 60).media).toBe(131)
  })
  it('las alturas quedan ordenadas aunque la pantalla sea muy baja', () => {
    const a = calcularAnclajes(300, 200, 0, 0)
    expect(a.colapsada).toBeLessThan(a.media)
    expect(a.media).toBeLessThan(a.expandida)
  })
})
