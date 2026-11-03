import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { conCacheDeClima } from './cache.ts'
import { crearServicioClimaSimulado, type FetchClima } from './servicio-simulado.ts'
import type { EscenarioClima, EstadoClima } from './tipos.ts'
import error from '../../public/api/clima/error.json'
import lento from '../../public/api/clima/lento.json'
import lluvia from '../../public/api/clima/lluvia.json'
import seco from '../../public/api/clima/seco.json'

const ARCHIVOS: Record<string, unknown> = { seco, lluvia, lento, error }
const ARCHIVO = (nombre: string) => JSON.stringify(ARCHIVOS[nombre])

function respuesta(texto: string, status = 200) {
  return { ok: status >= 200 && status < 300, status, text: () => Promise.resolve(texto) }
}

/** `fetch` que sirve los archivos reales de `public/api/clima/`. */
function fetchDeArchivos() {
  return vi.fn<FetchClima>((url) => {
    const nombre = /\/api\/clima\/(\w+)\.json$/.exec(url)?.[1]
    return Promise.resolve(nombre ? respuesta(ARCHIVO(nombre)) : respuesta('<!doctype html>', 404))
  })
}

function servicio(escenario: EscenarioClima, fetch: FetchClima) {
  return crearServicioClimaSimulado({ escenario: () => escenario, fetch })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T13:00:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('servicio de clima simulado', () => {
  it('seco: no llueve', async () => {
    const f = fetchDeArchivos()
    await expect(servicio('seco', f).consultar()).resolves.toEqual({
      tipo: 'ok',
      llueve: false,
      descripcion: 'Sin lluvia',
      fuente: 'simulado',
      obtenidoEn: '2026-11-05T13:00:00.000Z',
    })
    expect(f).toHaveBeenCalledWith(
      '/api/clima/seco.json',
      expect.objectContaining({ cache: 'no-store' }),
    )
  })

  it('lluvia: llueve', async () => {
    const estado = await servicio('lluvia', fetchDeArchivos()).consultar()
    expect(estado).toMatchObject({ tipo: 'ok', llueve: true, descripcion: 'Lluvia' })
  })

  it('error: el cuerpo no trae `llueve` y queda no disponible', async () => {
    const estado = await servicio('error', fetchDeArchivos()).consultar()
    expect(estado).toEqual({ tipo: 'no-disponible', motivo: 'respuesta-invalida' })
  })

  it('lento: espera 3 s antes de pedir y responde llueve antes de los 5 s', async () => {
    const f = fetchDeArchivos()
    let resultado: EstadoClima | undefined
    void servicio('lento', f)
      .consultar()
      .then((e) => (resultado = e))
    await vi.advanceTimersByTimeAsync(2999)
    expect(f).not.toHaveBeenCalled()
    expect(resultado).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(f).toHaveBeenCalledWith('/api/clima/lento.json', expect.anything())
    expect(resultado).toMatchObject({ tipo: 'ok', llueve: true })
  })

  it('un 503 es no disponible (respuesta inválida)', async () => {
    const f = vi.fn(() => Promise.resolve(respuesta('Service Unavailable', 503)))
    await expect(servicio('lluvia', f).consultar()).resolves.toEqual({
      tipo: 'no-disponible',
      motivo: 'respuesta-invalida',
    })
  })

  it('sin red: no disponible (red), nunca "no llueve"', async () => {
    const f = vi.fn(() => Promise.reject(new TypeError('Failed to fetch')))
    await expect(servicio('seco', f).consultar()).resolves.toEqual({
      tipo: 'no-disponible',
      motivo: 'red',
    })
  })

  it('un HTML en lugar de JSON (fallback de la SPA) es respuesta inválida', async () => {
    const f = vi.fn(() => Promise.resolve(respuesta('<!doctype html><html></html>')))
    await expect(servicio('lluvia', f).consultar()).resolves.toEqual({
      tipo: 'no-disponible',
      motivo: 'respuesta-invalida',
    })
  })

  it('`llueve` que no es booleano es respuesta inválida', async () => {
    const f = vi.fn(() => Promise.resolve(respuesta('{"llueve":"si"}')))
    await expect(servicio('lluvia', f).consultar()).resolves.toMatchObject({
      tipo: 'no-disponible',
    })
  })

  it('una respuesta que tarda 6 s se corta a los 5 s con timeout y aborta el pedido', async () => {
    let senal: AbortSignal | undefined
    const f = vi.fn<FetchClima>((_url, init) => {
      senal = init.signal
      return new Promise((resolver) => {
        setTimeout(() => resolver(respuesta(ARCHIVO('lluvia'))), 6000)
      })
    })
    let resultado: EstadoClima | undefined
    void servicio('lluvia', f)
      .consultar()
      .then((e) => (resultado = e))
    await vi.advanceTimersByTimeAsync(4999)
    expect(resultado).toBeUndefined()
    await vi.advanceTimersByTimeAsync(1)
    expect(resultado).toEqual({ tipo: 'no-disponible', motivo: 'timeout' })
    expect(senal?.aborted).toBe(true)
  })

  it('cancelar desde afuera no rechaza la promesa', async () => {
    const f = vi.fn<FetchClima>(() => new Promise(() => {}))
    const control = new AbortController()
    const promesa = servicio('lluvia', f).consultar(control.signal)
    control.abort()
    await expect(promesa).resolves.toEqual({ tipo: 'no-disponible', motivo: 'red' })
  })
})

describe('reutilización de 5 minutos', () => {
  it('a los 2 min no vuelve a pedir; a los 6 min sí', async () => {
    const f = fetchDeArchivos()
    const esc: EscenarioClima = 'lluvia'
    const s = conCacheDeClima(servicio(esc, f), { escenario: () => esc })
    await s.consultar()
    expect(f).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(2 * 60_000)
    await expect(s.consultar()).resolves.toMatchObject({ tipo: 'ok', llueve: true })
    expect(f).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(4 * 60_000)
    await s.consultar()
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('cambiar el escenario invalida la respuesta guardada', async () => {
    const f = fetchDeArchivos()
    let esc: EscenarioClima = 'seco'
    const escenario = () => esc
    const s = conCacheDeClima(crearServicioClimaSimulado({ escenario, fetch: f }), { escenario })
    await expect(s.consultar()).resolves.toMatchObject({ llueve: false })
    esc = 'lluvia'
    await expect(s.consultar()).resolves.toMatchObject({ llueve: true })
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('no guarda las respuestas no disponibles (Reintentar vuelve a consultar)', async () => {
    const f = fetchDeArchivos()
    const s = conCacheDeClima(servicio('error', f), { escenario: () => 'error' })
    await s.consultar()
    await s.consultar()
    expect(f).toHaveBeenCalledTimes(2)
  })

  it('`invalidar` fuerza una consulta nueva', async () => {
    const f = fetchDeArchivos()
    const s = conCacheDeClima(servicio('seco', f), { escenario: () => 'seco' })
    await s.consultar()
    s.invalidar()
    await s.consultar()
    expect(f).toHaveBeenCalledTimes(2)
  })
})
