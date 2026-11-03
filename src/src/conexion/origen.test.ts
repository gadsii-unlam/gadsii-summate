import { describe, expect, it } from 'vitest'
import cierresIncluidos from '../../public/data/cierres.json'
import {
  horaCorta,
  origenDeRespuesta,
  origenRespaldo,
  textoCierresSinActualizar,
} from './origen.ts'

const AR = 'America/Argentina/Buenos_Aires'

describe('origen de los cierres', () => {
  it('red: la respuesta no trae la marca del service worker', () => {
    expect(origenDeRespuesta(new Headers({ Date: 'Thu, 22 Oct 2026 16:40:00 GMT' }))).toEqual({
      origen: 'red',
    })
  })

  it('caché: trae la marca y la hora en que se guardó', () => {
    expect(
      origenDeRespuesta(
        new Headers({ 'X-DQ-Origen': 'cache', 'X-DQ-Guardado-En': '2026-10-22T16:40:00.000Z' }),
      ),
    ).toEqual({ origen: 'cache', guardadoEn: '2026-10-22T16:40:00.000Z' })
  })

  it('caché sin hora propia: usa Date', () => {
    expect(
      origenDeRespuesta(
        new Headers({ 'X-DQ-Origen': 'cache', Date: 'Thu, 22 Oct 2026 16:40:00 GMT' }),
      ),
    ).toEqual({ origen: 'cache', guardadoEn: '2026-10-22T16:40:00.000Z' })
  })

  it('respaldo: la fecha de la copia incluida en el bundle', () => {
    expect(origenRespaldo(cierresIncluidos.actualizado)).toEqual({
      origen: 'respaldo',
      guardadoEn: new Date(cierresIncluidos.actualizado).toISOString(),
    })
    expect(origenRespaldo(undefined)).toEqual({ origen: 'respaldo', guardadoEn: null })
  })
})

describe('texto del aviso', () => {
  it('Cierres sin actualizar desde las 13:40 (copia guardada)', () => {
    expect(
      textoCierresSinActualizar({ origen: 'cache', guardadoEn: '2026-10-22T16:40:00.000Z' }, AR),
    ).toBe('Cierres sin actualizar desde las 13:40')
  })

  it('con la copia incluida usa su fecha', () => {
    expect(textoCierresSinActualizar(origenRespaldo('2026-10-22T09:05:00-03:00'), AR)).toBe(
      'Cierres sin actualizar desde las 09:05',
    )
  })

  it('sin hora conocida', () => {
    expect(textoCierresSinActualizar({ origen: 'respaldo', guardadoEn: null })).toBe(
      'Cierres sin actualizar',
    )
  })

  it('con cierres de la red no hay aviso', () => {
    expect(textoCierresSinActualizar({ origen: 'red' })).toBeNull()
    expect(textoCierresSinActualizar(null)).toBeNull()
  })

  it('horaCorta en 24 horas', () => {
    expect(horaCorta('2026-10-22T02:05:00.000Z', AR)).toBe('23:05')
  })
})
