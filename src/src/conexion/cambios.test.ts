import { describe, expect, it } from 'vitest'
import { compararRutas } from './cambios.ts'

const RUTA = { nodos: ['a', 'b', 'c'], aristas: ['arista__a__b', 'arista__b__c'] }

describe('compararRutas', () => {
  it('igual si la ruta nueva es la misma', () => {
    expect(compararRutas(RUTA, { nodos: ['a', 'b', 'c'] })).toBe('igual')
  })

  it('cambios si la ruta nueva es otra', () => {
    expect(compararRutas(RUTA, { nodos: ['a', 'd', 'c'] })).toBe('cambios')
    expect(compararRutas(RUTA, null)).toBe('cambios')
  })

  it('tramo cerrado si la ruta mostrada pasa por un nodo o una arista cerrada', () => {
    expect(compararRutas(RUTA, { nodos: ['a', 'd', 'c'] }, { nodos: new Set(['b']) })).toBe(
      'tramo-cerrado',
    )
    expect(
      compararRutas(RUTA, { nodos: ['a', 'd', 'c'] }, { aristas: new Set(['arista__b__c']) }),
    ).toBe('tramo-cerrado')
    expect(compararRutas(RUTA, { nodos: ['a', 'b', 'c'] }, { nodos: new Set(['z']) })).toBe('igual')
  })
})
