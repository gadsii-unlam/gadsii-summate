import { afterEach, describe, expect, it, vi } from 'vitest'
import { URL_GRAFO } from '../datos/index.ts'
import { calcularRuta, cargarGrafoRuteable, olvidarGrafoRuteable } from './index.ts'
import { GRAFO_CAMPUS } from './test/datos-reales.ts'

const respuesta = (datos: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 404,
  json: async () => datos,
})

describe('cargarGrafoRuteable (integración con el grafo.json real)', () => {
  afterEach(() => olvidarGrafoRuteable())

  it('descarga y prepara el grafo una sola vez y responde Entrada Florencio Varela → Aula 121', async () => {
    const fetch = vi.fn(async () => respuesta(structuredClone(GRAFO_CAMPUS)))
    const [grafo, otraVez] = await Promise.all([
      cargarGrafoRuteable({ fetch }),
      cargarGrafoRuteable({ fetch }),
    ])
    expect(await cargarGrafoRuteable({ fetch })).toBe(grafo)
    expect(otraVez).toBe(grafo)
    expect(fetch).toHaveBeenCalledOnce()
    expect(fetch).toHaveBeenCalledWith(URL_GRAFO)
    expect(grafo.version).toBe(GRAFO_CAMPUS.version)

    const r = calcularRuta(grafo, {
      origen: ['entrada-campus-florencio-varela'],
      destino: ['puerta-aula-121'],
      criterio: 'mas-corta',
    })
    expect(r.tipo).toBe('ruta')
    if (r.tipo !== 'ruta') return
    expect(r.puertaOrigen).toBe('entrada-campus-florencio-varela')
    expect(r.puertaDestino).toBe('puerta-aula-121')
    expect(r.distanciaPx).toBeCloseTo(1106.57, 2)
    expect(r.exteriorPx).toBeCloseTo(403.72, 2)
    expect(r.tiempoMin).toBe(3)
  })

  it('si la descarga falla, la próxima llamada vuelve a intentar', async () => {
    const falla = vi.fn(async () => respuesta(null, false))
    await expect(cargarGrafoRuteable({ fetch: falla })).rejects.toThrow(/HTTP 404/)
    const bien = vi.fn(async () => respuesta(structuredClone(GRAFO_CAMPUS)))
    const grafo = await cargarGrafoRuteable({ fetch: bien })
    expect(grafo.aristas).toHaveLength(690)
    expect(bien).toHaveBeenCalledOnce()
  })
})
