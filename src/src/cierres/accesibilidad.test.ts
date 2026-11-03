import { describe, expect, it } from 'vitest'
import {
  ENTRADAS_CAMPUS,
  TEXTO_SIN_ACCESO,
  estadoAcceso,
  lugaresSinAcceso,
  nodosAlcanzables,
} from './accesibilidad.ts'
import { GIMNASIO } from '../rutas/test/datos-reales.ts'
import { LUGARES, cierre, cierreDeEjemplo, grafoReal } from './test/datos.ts'
import { tramosDeCierres } from './vigencia.ts'

const grafo = grafoReal()
const sinAcceso = (...cierres: Parameters<typeof tramosDeCierres>[0][number][]) =>
  lugaresSinAcceso(grafo, LUGARES, tramosDeCierres(cierres))

describe('"Sin acceso ahora" (3.2)', () => {
  it('sin cierres, todos los lugares tienen acceso (el grafo es conexo)', () => {
    expect(sinAcceso().size).toBe(0)
    expect(nodosAlcanzables(grafo, tramosDeCierres([])).size).toBe(grafo.nodos.length)
    for (const e of ENTRADAS_CAMPUS) expect(grafo.indiceNodo.has(e)).toBe(true)
  })

  it('con escalera-radio-primer-piso cerrado, el 1er piso queda sin acceso (y nada más)', () => {
    const primerPiso = LUGARES.filter((l) => l.piso === '1').map((l) => l.id)
    expect(primerPiso).toContain('lab-quimica')
    expect([...sinAcceso(cierreDeEjemplo('escalera-radio'))].sort()).toEqual(primerPiso.sort())
  })

  it('con solo el acceso sur del Gimnasio cerrado, el Gimnasio sigue accesible', () => {
    const s = sinAcceso(cierre('g', 'm', { nodos: ['acceso-gimnasio-sur'] }))
    expect(s.has('gimnasio')).toBe(false)
  })

  it('con los dos accesos del Gimnasio cerrados, queda sin acceso', () => {
    const s = sinAcceso(cierre('g', 'm', { nodos: [...GIMNASIO] }))
    expect(s.has('gimnasio')).toBe(true)
  })

  it('cerrar las cuatro entradas al campus deja todo sin acceso', () => {
    const s = sinAcceso(cierre('todo', 'm', { nodos: [...ENTRADAS_CAMPUS] }))
    expect(s.size).toBe(LUGARES.length)
  })
})

describe('estado de acceso para la lista de lugares (4.1)', () => {
  it('Laboratorio de Química dice "Sin acceso ahora" y la etiqueta nunca es un guion', () => {
    const s = sinAcceso(cierreDeEjemplo('escalera-radio'))
    expect(estadoAcceso('lab-quimica', s)).toEqual({
      sinAcceso: true,
      etiqueta: TEXTO_SIN_ACCESO,
    })
    expect(TEXTO_SIN_ACCESO).toBe('Sin acceso ahora')
    for (const l of LUGARES) {
      const { etiqueta } = estadoAcceso(l.id, s)
      expect(etiqueta === null || etiqueta === 'Sin acceso ahora').toBe(true)
      expect(['-', '–', '—']).not.toContain(etiqueta)
    }
    expect(estadoAcceso('aula-121', s)).toEqual({ sinAcceso: false, etiqueta: null })
  })
})
