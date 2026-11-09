import { describe, expect, it } from 'vitest'
import { calcularRuta, rutaDesdeNodos } from './index.ts'
import { grafoReal } from './test/datos-reales.ts'

describe('rutaDesdeNodos', () => {
  const g = grafoReal()
  for (const criterio of ['mas-corta', 'resguardada'] as const) {
    it(`rearma la misma ruta que A* (${criterio})`, () => {
      const r = calcularRuta(g, {
        origen: ['puerta-aula-309'],
        destino: ['puerta-aula-103'],
        criterio,
      })
      if (r.tipo !== 'ruta') throw new Error('sin ruta')
      const rearmada = rutaDesdeNodos(g, criterio, r.nodos)
      expect(rearmada).toEqual({ ...r, nodosExpandidos: 0 })
    })
  }

  it('devuelve null con nodos que no existen o que no son vecinos', () => {
    expect(rutaDesdeNodos(g, 'mas-corta', ['puerta-aula-309', 'no-existe'])).toBeNull()
    expect(rutaDesdeNodos(g, 'mas-corta', ['puerta-aula-309', 'puerta-aula-103'])).toBeNull()
    expect(rutaDesdeNodos(g, 'mas-corta', ['puerta-aula-309'])).toBeNull()
  })
})
