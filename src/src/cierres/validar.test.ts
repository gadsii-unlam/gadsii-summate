import { describe, expect, it } from 'vitest'
import { grafoReal } from '../rutas/test/datos-reales.ts'
import { GRAFO_CAMPUS } from '../rutas/test/datos-reales.ts'
import vacio from '../../public/data/cierres.json'
import { ARCHIVO_EJEMPLO } from './test/datos.ts'
import type { CodigoProblema } from './tipos.ts'
import { MOTIVO_POR_DEFECTO, indexarGrafo, normalizarArista, validarCierres } from './validar.ts'

const indice = indexarGrafo(grafoReal())
const archivo = (...cierres: unknown[]) => ({ version: 1, cierres })
const codigos = (datos: unknown): CodigoProblema[] =>
  validarCierres(datos, indice).problemas.map((p) => p.codigo)

describe('validarCierres', () => {
  it('el archivo publicado tiene version 1 y la lista vacía, sin problemas', () => {
    const r = validarCierres(vacio, indice)
    expect(r).toEqual({ formaValida: true, cierres: [], problemas: [] })
  })

  it('el archivo de ejemplo del design valida sin problemas y normaliza las fechas', () => {
    const r = validarCierres(ARCHIVO_EJEMPLO, indice)
    expect(r.problemas).toEqual([])
    expect(r.cierres.map((c) => c.id)).toEqual([
      'obra-entrada-edificio-sur',
      'vereda-entrada-principal',
      'escalera-radio',
    ])
    const [obra, vereda, escalera] = r.cierres
    expect(obra).toMatchObject({
      nodos: ['entrada-ed-sur-oeste-sur'],
      aristas: [],
      desde: Date.UTC(2026, 10, 3, 10, 0),
      hasta: Date.UTC(2026, 10, 15, 2, 0),
      siempreVigente: false,
    })
    expect(vereda).toMatchObject({ desde: null, hasta: null })
    expect(escalera).toMatchObject({ desde: null, hasta: Date.UTC(2026, 10, 5, 16, 0) })
  })

  it('el mismo índice se arma desde grafo.json o desde el grafo ruteable', () => {
    const desdeJson = indexarGrafo(GRAFO_CAMPUS)
    expect([...desdeJson.nodos].sort()).toEqual([...indice.nodos].sort())
    expect(desdeJson.aristaPorExtremos).toEqual(indice.aristaPorExtremos)
  })

  it.each([null, [], 'texto', { cierres: [] }, { version: 2, cierres: [] }, { version: 1 }])(
    'forma inválida: %j',
    (datos) => {
      const r = validarCierres(datos, indice)
      expect(r.formaValida).toBe(false)
      expect(r.cierres).toEqual([])
      expect(r.problemas.map((p) => p.codigo)).toEqual(['forma-invalida'])
    },
  )

  it('normaliza una arista escrita al revés al id del grafo, sin problema', () => {
    expect(
      normalizarArista(
        indice,
        'arista__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste',
      ),
    ).toBe(
      'arista__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur',
    )
    const r = validarCierres(
      archivo({
        id: 'x',
        motivo: 'm',
        aristas: [
          'arista__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste',
        ],
      }),
      indice,
    )
    expect(r.problemas).toEqual([])
    expect(r.cierres[0]?.aristas).toEqual([
      'arista__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur',
    ])
  })

  it('ignora los ids desconocidos y aplica el resto del cierre', () => {
    const r = validarCierres(
      archivo({
        id: 'tipeo',
        motivo: 'm',
        nodos: ['entrada-ed-sur-oeste-sur', 'entrada-ed-sur-oeste-99'],
        aristas: [
          'arista__no__existe',
          'cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste',
        ],
      }),
      indice,
    )
    expect(r.cierres[0]?.nodos).toEqual(['entrada-ed-sur-oeste-sur'])
    expect(r.cierres[0]?.aristas).toEqual([])
    expect(r.problemas.map((p) => p.mensaje)).toEqual([
      'id desconocido: entrada-ed-sur-oeste-99 en el cierre tipeo',
      'id desconocido: arista__no__existe en el cierre tipeo',
      'id desconocido: cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste en el cierre tipeo',
    ])
  })

  it('quita repetidos de nodos y aristas (también una arista escrita en los dos sentidos)', () => {
    const r = validarCierres(
      archivo({
        id: 'x',
        motivo: 'm',
        nodos: ['entrada-ed-sur-oeste-sur', 'entrada-ed-sur-oeste-sur'],
        aristas: [
          'arista__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur',
          'arista__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste',
        ],
      }),
      indice,
    )
    expect(r.cierres[0]).toMatchObject({
      nodos: ['entrada-ed-sur-oeste-sur'],
      aristas: [
        'arista__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur',
      ],
    })
  })

  it('descarta el cierre sin ningún nodo ni arista válido', () => {
    const r = validarCierres(archivo({ id: 'x', motivo: 'm', nodos: ['nada'] }), indice)
    expect(r.cierres).toEqual([])
    expect(r.problemas.map((p) => p.codigo)).toEqual(['id-desconocido', 'sin-tramos'])
    expect(codigos(archivo({ id: 'y', motivo: 'm' }))).toEqual(['sin-tramos'])
    expect(codigos(archivo({ id: 'z', motivo: 'm', nodos: [], aristas: [] }))).toEqual([
      'sin-tramos',
    ])
  })

  it('fecha inválida: el cierre queda siempre vigente y se advierte', () => {
    for (const desde of ['2026-13-01T07:00:00-03:00', '2026-02-30', 'mañana', 12]) {
      const r = validarCierres(
        archivo({ id: 'x', motivo: 'm', nodos: ['entrada-ed-sur-oeste-sur'], desde }),
        indice,
      )
      expect(r.problemas.map((p) => p.codigo)).toEqual(['fecha-invalida'])
      expect(r.cierres[0]?.siempreVigente).toBe(true)
    }
  })

  it('"hasta" no posterior a "desde": se advierte y el cierre queda siempre vigente', () => {
    for (const hasta of ['2026-11-03T07:00:00-03:00', '2026-11-01T07:00:00-03:00']) {
      const r = validarCierres(
        archivo({
          id: 'x',
          motivo: 'm',
          nodos: ['entrada-ed-sur-oeste-sur'],
          desde: '2026-11-03T07:00:00-03:00',
          hasta,
        }),
        indice,
      )
      expect(r.problemas.map((p) => p.codigo)).toEqual(['hasta-no-posterior'])
      expect(r.cierres[0]?.siempreVigente).toBe(true)
    }
  })

  it('ids de cierre repetidos: se advierte y se aplican los dos', () => {
    const c = { id: 'x', motivo: 'm', nodos: ['entrada-ed-sur-oeste-sur'] }
    const r = validarCierres(archivo(c, c), indice)
    expect(r.problemas.map((p) => p.codigo)).toEqual(['id-duplicado'])
    expect(r.cierres).toHaveLength(2)
  })

  it('sin motivo: usa "Cerrado temporalmente" y se advierte', () => {
    for (const motivo of [undefined, '', '   ', 3]) {
      const r = validarCierres(
        archivo({ id: 'x', motivo, nodos: ['entrada-ed-sur-oeste-sur'] }),
        indice,
      )
      expect(r.problemas.map((p) => p.codigo)).toEqual(['sin-motivo'])
      expect(r.cierres[0]?.motivo).toBe(MOTIVO_POR_DEFECTO)
    }
  })

  it('sin id: se aplica con un id sintético y se advierte', () => {
    const r = validarCierres(archivo({ motivo: 'm', nodos: ['entrada-ed-sur-oeste-sur'] }), indice)
    expect(r.problemas.map((p) => p.codigo)).toEqual(['sin-id'])
    expect(r.cierres[0]?.id).toBe('cierre-1')
  })

  it('elementos que no son objetos y listas mal escritas', () => {
    expect(codigos(archivo('x'))).toEqual(['cierre-invalido'])
    expect(
      codigos(
        archivo({
          id: 'x',
          motivo: 'm',
          nodos: 'entrada-ed-sur-oeste-sur',
          aristas: [
            'arista__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur',
          ],
        }),
      ),
    ).toEqual(['cierre-invalido'])
  })
})
