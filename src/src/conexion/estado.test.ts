import { afterEach, describe, expect, it, vi } from 'vitest'
import { crearMonitorConexion, esFallaDeRed, type VentanaConexion } from './estado.ts'

class VentanaFalsa implements VentanaConexion {
  navigator = { onLine: true }
  oyentes = new Map<string, Set<() => void>>()
  addEventListener(tipo: string, o: () => void) {
    if (!this.oyentes.has(tipo)) this.oyentes.set(tipo, new Set())
    this.oyentes.get(tipo)?.add(o)
  }
  removeEventListener(tipo: string, o: () => void) {
    this.oyentes.get(tipo)?.delete(o)
  }
  disparar(tipo: 'online' | 'offline') {
    this.navigator.onLine = tipo === 'online'
    for (const o of this.oyentes.get(tipo) ?? []) o()
  }
}

const cabeceras = (h: Record<string, string>) => new Headers(h)

afterEach(() => {
  vi.useRealTimers()
})

describe('esFallaDeRed', () => {
  it('cuenta TypeError y timeouts, no cancelaciones ni errores HTTP', () => {
    expect(esFallaDeRed(new TypeError('Failed to fetch'))).toBe(true)
    expect(esFallaDeRed(new DOMException('t', 'TimeoutError'))).toBe(true)
    expect(esFallaDeRed(new Error('timeout de 5000 ms'))).toBe(true)
    expect(esFallaDeRed(Object.assign(new Error('timeout'), { name: 'ErrorTimeout' }))).toBe(true)
    expect(esFallaDeRed(new DOMException('cancelada', 'AbortError'))).toBe(false)
    expect(esFallaDeRed(new Error('HTTP 500'))).toBe(false)
    expect(esFallaDeRed('x')).toBe(false)
  })
})

describe('monitor de conexión', () => {
  it('un TypeError de cierres o clima pasa a sin conexión aunque navigator.onLine sea true', () => {
    const ventana = new VentanaFalsa()
    const m = crearMonitorConexion({ ventana })
    const cambios: string[] = []
    m.suscribir((e) => cambios.push(e))
    expect(ventana.navigator.onLine).toBe(true)
    expect(m.estado).toBe('en-linea')
    m.reportarFalla(new TypeError('Failed to fetch'))
    expect(m.estado).toBe('sin-conexion')
    expect(cambios).toEqual(['sin-conexion'])
  })

  it('un timeout del clima pasa a sin conexión; el escenario error no', () => {
    const m = crearMonitorConexion({ ventana: new VentanaFalsa() })
    m.reportarClima({ tipo: 'no-disponible', motivo: 'respuesta-invalida' })
    expect(m.estado).toBe('en-linea')
    m.reportarClima({ tipo: 'no-disponible', motivo: 'timeout' })
    expect(m.estado).toBe('sin-conexion')
    m.reportarClima({ tipo: 'ok' })
    expect(m.estado).toBe('en-linea')
    m.reportarClima({ tipo: 'no-disponible', motivo: 'red' })
    expect(m.estado).toBe('sin-conexion')
  })

  it('los cierres servidos desde la caché del service worker cuentan como sin conexión', () => {
    const m = crearMonitorConexion({ ventana: new VentanaFalsa() })
    m.reportarRespuesta({ headers: cabeceras({ 'X-DQ-Origen': 'cache' }) })
    expect(m.estado).toBe('sin-conexion')
    m.reportarRespuesta({ headers: cabeceras({}) })
    expect(m.estado).toBe('en-linea')
  })

  it('el evento offline pasa a sin conexión; online avisa pero no vuelve solo a en línea', () => {
    const ventana = new VentanaFalsa()
    const m = crearMonitorConexion({ ventana })
    const reintentos = vi.fn()
    m.alVolverLaRed(reintentos)
    ventana.disparar('offline')
    expect(m.estado).toBe('sin-conexion')
    ventana.disparar('online')
    expect(reintentos).toHaveBeenCalledTimes(1)
    expect(m.estado).toBe('sin-conexion')
    m.reportarRespuesta({ headers: cabeceras({}) })
    expect(m.estado).toBe('en-linea')
  })

  it('arranca sin conexión si navigator.onLine es false', () => {
    const ventana = new VentanaFalsa()
    ventana.navigator.onLine = false
    expect(crearMonitorConexion({ ventana }).estado).toBe('sin-conexion')
  })

  it('destruir quita los oyentes', () => {
    const ventana = new VentanaFalsa()
    const m = crearMonitorConexion({ ventana })
    m.destruir()
    ventana.disparar('offline')
    expect(m.estado).toBe('en-linea')
  })

  it('sin ventana no escucha eventos ni lanza', () => {
    const m = crearMonitorConexion({ ventana: undefined })
    expect(m.estado).toBe('en-linea')
    expect(() => m.destruir()).not.toThrow()
  })
})

describe('envolverFetch', () => {
  it('informa el TypeError de fetch y lo vuelve a lanzar', async () => {
    const m = crearMonitorConexion({ ventana: new VentanaFalsa() })
    const obtener = m.envolverFetch(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(obtener()).rejects.toThrow(TypeError)
    expect(m.estado).toBe('sin-conexion')
  })

  it('una cancelación no cambia el estado', async () => {
    const m = crearMonitorConexion({ ventana: new VentanaFalsa() })
    const obtener = m.envolverFetch(() => Promise.reject(new DOMException('x', 'AbortError')))
    await expect(obtener()).rejects.toThrow()
    expect(m.estado).toBe('en-linea')
  })

  it('la cancelación por timeout del clima (signal.reason) sí cuenta', async () => {
    const m = crearMonitorConexion({ ventana: new VentanaFalsa() })
    class ErrorTimeout extends Error {
      override name = 'ErrorTimeout'
    }
    const obtener = m.envolverFetch(() => Promise.reject(new ErrorTimeout('timeout')))
    await expect(obtener()).rejects.toThrow()
    expect(m.estado).toBe('sin-conexion')
  })

  it('una respuesta de la red vuelve a en línea; una de la caché del SW, a sin conexión', async () => {
    const m = crearMonitorConexion({ ventana: new VentanaFalsa() })
    const deCache = m.envolverFetch(() =>
      Promise.resolve(new Response('{}', { headers: { 'X-DQ-Origen': 'cache' } })),
    )
    await deCache()
    expect(m.estado).toBe('sin-conexion')
    const deRed = m.envolverFetch(() => Promise.resolve(new Response('{}', { status: 500 })))
    await deRed()
    expect(m.estado).toBe('en-linea')
  })

  it('con timeoutMs, una petición colgada pasa a sin conexión antes de terminar', async () => {
    vi.useFakeTimers()
    const m = crearMonitorConexion({ ventana: new VentanaFalsa() })
    let responder: (r: Response) => void = () => {}
    const obtener = m.envolverFetch(() => new Promise<Response>((ok) => (responder = ok)), {
      timeoutMs: 4000,
    })
    const pedido = obtener()
    await vi.advanceTimersByTimeAsync(3999)
    expect(m.estado).toBe('en-linea')
    await vi.advanceTimersByTimeAsync(1)
    expect(m.estado).toBe('sin-conexion')
    responder(new Response('{}'))
    await pedido
    expect(m.estado).toBe('en-linea')
  })
})
