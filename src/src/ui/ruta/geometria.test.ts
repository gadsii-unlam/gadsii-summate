import { describe, expect, it } from 'vitest'
import type { PuntoMapa } from '../../rutas/index.ts'
import { puntosIniciales } from './geometria.ts'

describe('puntosIniciales', () => {
  it('corta la polilínea a los primeros px, interpolando el último punto', () => {
    expect(
      puntosIniciales(
        [
          [0, 0],
          [100, 0],
          [100, 100],
        ],
        140,
      ),
    ).toEqual([
      [0, 0],
      [100, 0],
      [100, 40],
    ])
  })

  it('una ruta más corta que el largo pedido queda entera', () => {
    const corta: PuntoMapa[] = [
      [0, 0],
      [30, 0],
    ]
    expect(puntosIniciales(corta, 140)).toEqual([
      [0, 0],
      [30, 0],
    ])
  })
})
