import { describe, expect, it } from 'vitest'
import {
  ESTILO_TRAMO_CERRADO,
  TAMANO_TACTIL_ICONO,
  capaDeCierres,
  detalleDeCierre,
  puntoMedio,
} from './capa.ts'
import { parsearFecha } from './fechas.ts'
import { ZONA_AR, cierresEjemplo, grafoReal } from './test/datos.ts'
import { cierresVigentes } from './vigencia.ts'

const grafo = grafoReal()
const nodo = (id: string) => grafo.nodos[grafo.indiceNodo.get(id)!]!

describe('capa de tramos cerrados (4.3)', () => {
  it('estilo: rojo #D93025 punteado y objetivo táctil de al menos 44 px', () => {
    expect(ESTILO_TRAMO_CERRADO).toEqual({ color: '#D93025', grosor: 4, guiones: '6 6' })
    expect(TAMANO_TACTIL_ICONO).toBeGreaterThanOrEqual(44)
  })

  it('solo incluye los cierres vigentes', () => {
    const todos = cierresEjemplo()
    const antes = cierresVigentes(todos, parsearFecha('2026-11-02T18:00-03:00')!)
    expect(capaDeCierres(grafo, antes).map((t) => t.cierreId)).toEqual([
      'vereda-entrada-principal',
      'escalera-radio',
    ])
    const despues = cierresVigentes(todos, parsearFecha('2026-11-05T13:00-03:00')!)
    expect(capaDeCierres(grafo, despues).map((t) => t.cierreId)).toEqual([
      'obra-entrada-edificio-sur',
      'vereda-entrada-principal',
    ])
    expect(capaDeCierres(grafo, [])).toEqual([])
  })

  it('arista cerrada: el tramo y el ícono en su punto medio', () => {
    const [, vereda] = capaDeCierres(grafo, cierresEjemplo())
    const a = nodo('cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste')
    const b = nodo('cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur')
    expect(vereda?.segmentos).toHaveLength(1)
    expect(vereda?.segmentos[0]?.[0]).toEqual([a.x, a.y])
    expect(vereda?.segmentos[0]?.at(-1)).toEqual([b.x, b.y])
    expect(vereda?.iconos).toHaveLength(1)
    const [mx, my] = vereda!.iconos[0]!.posicion
    expect(vereda?.iconos[0]?.sobre).toBe('arista')
    expect(mx).toBeCloseTo((a.x + b.x) / 2, 6)
    expect(my).toBeCloseTo((a.y + b.y) / 2, 6)
  })

  it('nodo cerrado: el ícono sobre el nodo y todas sus aristas', () => {
    const [obra] = capaDeCierres(grafo, cierresEjemplo())
    const n = nodo('entrada-ed-sur-oeste-sur')
    expect(obra?.iconos).toEqual([
      { posicion: [n.x, n.y], sobre: 'nodo', elemento: 'entrada-ed-sur-oeste-sur' },
    ])
    expect(obra?.segmentos).toHaveLength(n.vecinos.length)
    for (const s of obra!.segmentos) {
      expect(s.some(([x, y]) => x === n.x && y === n.y)).toBe(true)
    }
  })

  it('el detalle trae el motivo y "Cerrado hasta el 14/11 a las 23:00" para la obra', () => {
    const [obra, vereda] = capaDeCierres(grafo, cierresEjemplo())
    expect(detalleDeCierre(obra!, ZONA_AR)).toEqual({
      motivo: 'Obra en la entrada oeste del Edificio Sur',
      hasta: 'Cerrado hasta el 14/11 a las 23:00',
    })
    expect(detalleDeCierre(vereda!, ZONA_AR)).toEqual({
      motivo: 'Vereda en reparación frente a la entrada principal',
      hasta: null,
    })
  })

  it('punto medio de una polilínea con esquina', () => {
    expect(
      puntoMedio([
        [0, 0],
        [10, 0],
        [10, 30],
      ]),
    ).toEqual([10, 10])
    expect(puntoMedio([[5, 5]])).toEqual([5, 5])
  })
})
