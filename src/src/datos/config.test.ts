import { describe, expect, it } from 'vitest'
import { METROS_POR_PX, URL_GRAFO } from './index.ts'

describe('constantes de datos', () => {
  it('METROS_POR_PX sale de datos-fuente/config.json', () => {
    expect(METROS_POR_PX).toBe(0.18)
    expect(URL_GRAFO).toBe('/data/grafo.json')
  })
})
