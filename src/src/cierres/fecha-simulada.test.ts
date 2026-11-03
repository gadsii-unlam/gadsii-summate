import { describe, expect, it, vi } from 'vitest'
import { parsearFecha } from './fechas.ts'
import {
  CLAVE_FECHA_SIMULADA,
  crearReloj,
  leerFechaSimulada,
  textoFechaSimulada,
} from './fecha-simulada.ts'
import { ZONA_AR } from './test/datos.ts'

function almacen() {
  const datos = new Map<string, string>()
  return {
    datos,
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  }
}

const DIEZ = parsearFecha('2026-11-05T10:00-03:00')!

describe('fecha simulada (2.3)', () => {
  it('lee ?ahora= y lo guarda en la sesión', () => {
    const storage = almacen()
    expect(leerFechaSimulada({ search: '?ahora=2026-11-05T10:00-03:00', storage })).toBe(DIEZ)
    expect(storage.datos.get(CLAVE_FECHA_SIMULADA)).toBe('2026-11-05T10:00-03:00')
    // Otra navegación sin el parámetro: sigue simulada.
    expect(leerFechaSimulada({ search: '?destino=aula-121', storage })).toBe(DIEZ)
  })

  it('repara el "+" de la zona que URLSearchParams convierte en espacio', () => {
    const storage = almacen()
    expect(leerFechaSimulada({ search: '?ahora=2026-11-05T14:00+01:00', storage })).toBe(
      Date.UTC(2026, 10, 5, 13),
    )
  })

  it('?ahora= vacío o "real" la desactiva', () => {
    for (const valor of ['', 'real']) {
      const storage = almacen()
      storage.setItem(CLAVE_FECHA_SIMULADA, '2026-11-05T10:00-03:00')
      expect(leerFechaSimulada({ search: `?ahora=${valor}`, storage })).toBeNull()
      expect(storage.datos.has(CLAVE_FECHA_SIMULADA)).toBe(false)
    }
  })

  it('un valor inválido se ignora con advertencia y no se guarda', () => {
    const storage = almacen()
    const advertir = vi.fn()
    expect(leerFechaSimulada({ search: '?ahora=mañana', storage, advertir })).toBeNull()
    expect(advertir).toHaveBeenCalledWith(expect.stringContaining('fecha simulada inválida'))
    expect(storage.datos.size).toBe(0)
  })

  it('sin parámetro ni sesión (o sin almacenamiento) usa el reloj real', () => {
    expect(leerFechaSimulada({ search: '', storage: almacen() })).toBeNull()
    expect(leerFechaSimulada({ search: '?ahora=2026-11-05T10:00-03:00', storage: null })).toBe(DIEZ)
    const roto = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
      removeItem: () => {},
    }
    expect(leerFechaSimulada({ search: '?ahora=2026-11-05T10:00-03:00', storage: roto })).toBe(DIEZ)
    expect(leerFechaSimulada({ search: '', storage: roto })).toBeNull()
  })

  it('texto de la etiqueta y reloj fijo', () => {
    expect(textoFechaSimulada(DIEZ, ZONA_AR)).toBe('Fecha simulada: 05/11 10:00')
    expect(crearReloj(DIEZ)()).toBe(DIEZ)
    const real = crearReloj(null)()
    expect(Math.abs(real - Date.now())).toBeLessThan(1000)
  })
})
