import { describe, expect, it } from 'vitest'
import { formatearDiaHora, parsearFecha, textoCerradoHasta } from './fechas.ts'
import { cierre, cierreDeEjemplo, cierresEjemplo, ZONA_AR } from './test/datos.ts'
import { cierresVigentes, estaVigente, obtenerTramosExcluidos } from './vigencia.ts'

const f = (texto: string) => {
  const ms = parsearFecha(texto)
  if (ms === null) throw new Error(texto)
  return ms
}

describe('parsearFecha', () => {
  it('respeta la zona horaria explícita', () => {
    expect(parsearFecha('2026-11-03T07:00:00-03:00')).toBe(Date.UTC(2026, 10, 3, 10))
    expect(parsearFecha('2026-11-03T07:00-0300')).toBe(Date.UTC(2026, 10, 3, 10))
    expect(parsearFecha('2026-11-03T10:00:00Z')).toBe(Date.UTC(2026, 10, 3, 10))
    expect(parsearFecha('2026-11-03T12:00:00+02:00')).toBe(Date.UTC(2026, 10, 3, 10))
    expect(parsearFecha('2026-11-03T10:00:00.250Z')).toBe(Date.UTC(2026, 10, 3, 10, 0, 0, 250))
  })

  it('sin zona, interpreta en la hora local del dispositivo (también una fecha sola)', () => {
    expect(parsearFecha('2026-11-05T10:00')).toBe(new Date(2026, 10, 5, 10, 0).getTime())
    expect(parsearFecha('2026-11-05T10:00:30')).toBe(new Date(2026, 10, 5, 10, 0, 30).getTime())
    expect(parsearFecha('2026-11-05')).toBe(new Date(2026, 10, 5).getTime())
  })

  it.each([
    '',
    'mañana',
    '2026-11-31',
    '2026-00-10',
    '2026-11-05T24:00',
    '2026-11-05T10:60',
    '05/11/2026',
  ])('rechaza %j', (texto) => expect(parsearFecha(texto)).toBeNull())
})

describe('formato de fechas', () => {
  it('día y hora, y "Cerrado hasta el …"', () => {
    expect(formatearDiaHora(f('2026-11-05T10:00-03:00'), ZONA_AR)).toBe('05/11 10:00')
    expect(textoCerradoHasta(f('2026-11-14T23:00:00-03:00'), ZONA_AR)).toBe(
      'Cerrado hasta el 14/11 a las 23:00',
    )
    expect(formatearDiaHora(new Date(2026, 10, 5, 0, 5).getTime())).toBe('05/11 00:05')
  })
})

describe('estaVigente', () => {
  const obra = cierreDeEjemplo('obra-entrada-edificio-sur') // 03/11 07:00 → 14/11 23:00
  const escalera = cierreDeEjemplo('escalera-radio') // sin desde, hasta 05/11 13:00
  const vereda = cierreDeEjemplo('vereda-entrada-principal') // sin fechas

  it('"desde" es inclusivo', () => {
    expect(estaVigente(obra, f('2026-11-02T18:00-03:00'))).toBe(false)
    expect(estaVigente(obra, f('2026-11-03T06:59:59-03:00'))).toBe(false)
    expect(estaVigente(obra, f('2026-11-03T07:00-03:00'))).toBe(true)
  })

  it('"hasta" es exclusivo', () => {
    expect(estaVigente(obra, f('2026-11-14T22:59:59-03:00'))).toBe(true)
    expect(estaVigente(obra, f('2026-11-14T23:00-03:00'))).toBe(false)
    expect(estaVigente(escalera, f('2026-11-05T12:59:59-03:00'))).toBe(true)
    expect(estaVigente(escalera, f('2026-11-05T13:00-03:00'))).toBe(false)
  })

  it('sin "desde" vale desde siempre; sin "hasta", para siempre', () => {
    expect(estaVigente(escalera, f('2000-01-01T00:00Z'))).toBe(true)
    expect(estaVigente(vereda, f('2000-01-01T00:00Z'))).toBe(true)
    expect(estaVigente(vereda, f('2100-01-01T00:00Z'))).toBe(true)
    const desdeSolo = {
      ...cierre('d', 'm', { nodos: ['entrada-ed-sur-oeste-sur'] }),
      desde: f('2026-11-03T07:00-03:00'),
    }
    expect(estaVigente(desdeSolo, f('2100-01-01T00:00Z'))).toBe(true)
    expect(estaVigente(desdeSolo, f('2026-11-03T06:00-03:00'))).toBe(false)
  })

  it('con fecha inválida se considera vigente siempre', () => {
    const invalido = { ...obra, siempreVigente: true }
    expect(estaVigente(invalido, f('2000-01-01T00:00Z'))).toBe(true)
    expect(estaVigente(invalido, f('2100-01-01T00:00Z'))).toBe(true)
  })

  it('vigentes y tramos excluidos el 05/11 a las 10:00 y a las 13:00', () => {
    const todos = cierresEjemplo()
    const a_las_10 = f('2026-11-05T10:00-03:00')
    expect(cierresVigentes(todos, a_las_10).map((c) => c.id)).toEqual([
      'obra-entrada-edificio-sur',
      'vereda-entrada-principal',
      'escalera-radio',
    ])
    const ex = obtenerTramosExcluidos(todos, f('2026-11-05T13:00-03:00'))
    expect([...ex.nodos]).toEqual(['entrada-ed-sur-oeste-sur'])
    expect([...ex.aristas]).toEqual([
      'arista__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur',
    ])
  })
})
