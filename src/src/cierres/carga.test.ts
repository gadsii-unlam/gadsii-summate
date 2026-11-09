import { describe, expect, it, vi } from 'vitest'
import { calcularRuta } from '../rutas/index.ts'
import { URL_CIERRES, cargarCierres, type OpcionesCargaCierres } from './carga.ts'
import { ARCHIVO_EJEMPLO, grafoReal, lugar } from './test/datos.ts'
import { obtenerTramosExcluidos } from './vigencia.ts'

const grafo = grafoReal()
const respuesta = (datos: unknown, ok = true) => ({
  ok,
  status: ok ? 200 : 503,
  json: async () => datos,
})
const RESPALDO = {
  version: 1,
  cierres: [
    {
      id: 'obra',
      motivo: 'Obra en la entrada oeste del Edificio Sur',
      nodos: ['entrada-ed-sur-oeste-sur'],
    },
  ],
}

function cargar(fetch: NonNullable<OpcionesCargaCierres['fetch']>, timeoutMs?: number) {
  const advertir = vi.fn<(m: string) => void>()
  return {
    advertir,
    promesa: cargarCierres(grafo, { fetch, advertir, respaldo: RESPALDO, timeoutMs }),
  }
}

/** La ruta Enfermería → Aula 101 con los cierres cargados no pasa por entrada-ed-sur-oeste-sur. */
function evitaElPaso(cierres: Awaited<ReturnType<typeof cargarCierres>>['cierres']) {
  const r = calcularRuta(grafo, {
    origen: lugar('enfermeria').puertas,
    destino: lugar('aula-101').puertas,
    criterio: 'mas-corta',
    excluidos: obtenerTramosExcluidos(cierres, Date.now()),
  })
  return r.tipo === 'ruta' && !r.nodos.includes('entrada-ed-sur-oeste-sur')
}

describe('cargarCierres', () => {
  it('pide /data/cierres.json y usa la lista publicada', async () => {
    const fetch = vi.fn(async () => respuesta(structuredClone(ARCHIVO_EJEMPLO)))
    const { advertir, promesa } = cargar(fetch)
    const r = await promesa
    expect(fetch).toHaveBeenCalledWith(
      URL_CIERRES,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    )
    expect(r.fuente).toBe('red')
    expect(r.cierres.map((c) => c.id)).toEqual([
      'obra-entrada-edificio-sur',
      'vereda-entrada-principal',
      'escalera-radio',
    ])
    expect(advertir).not.toHaveBeenCalled()
  })

  it('lista vacía publicada: no hay cierres (no se usa el respaldo)', async () => {
    const { promesa } = cargar(async () => respuesta({ version: 1, cierres: [] }))
    const r = await promesa
    expect(r).toMatchObject({ fuente: 'red', cierres: [] })
  })

  it.each([
    ['falla de red', async () => Promise.reject(new TypeError('Failed to fetch'))],
    ['HTTP 503', async () => respuesta(null, false)],
    [
      'JSON inválido',
      async () => ({ ok: true, status: 200, json: async () => JSON.parse('{nope') as unknown }),
    ],
    ['forma incorrecta', async () => respuesta({ version: 1, cierres: 'ninguno' })],
  ])('con %s aplica los cierres de la copia incluida y advierte', async (_, fetch) => {
    const { advertir, promesa } = cargar(fetch)
    const r = await promesa
    expect(r.fuente).toBe('incluida')
    expect(r.cierres.map((c) => c.id)).toEqual(['obra'])
    expect(advertir).toHaveBeenCalledWith(expect.stringMatching(/^\[cierres\] .*copia incluida/))
    expect(evitaElPaso(r.cierres)).toBe(true)
  })

  it('con timeout de 5 s aplica la copia incluida', async () => {
    vi.useFakeTimers()
    try {
      let senal: AbortSignal | undefined
      const fetch = vi.fn(
        (_url: string, init?: { signal?: AbortSignal }) =>
          new Promise<ReturnType<typeof respuesta>>(() => {
            senal = init?.signal
          }),
      )
      const advertir = vi.fn<(m: string) => void>()
      const promesa = cargarCierres(grafo, { fetch, advertir, respaldo: RESPALDO })
      await vi.advanceTimersByTimeAsync(4999)
      expect(senal?.aborted).toBe(false)
      await vi.advanceTimersByTimeAsync(1)
      const r = await promesa
      expect(senal?.aborted).toBe(true)
      expect(r.fuente).toBe('incluida')
      expect(advertir).toHaveBeenCalledWith(expect.stringContaining('timeout de 5000 ms'))
    } finally {
      vi.useRealTimers()
    }
  })

  it('advierte cada id desconocido con el cierre y aplica el resto', async () => {
    const { advertir, promesa } = cargar(async () =>
      respuesta({
        version: 1,
        cierres: [
          {
            id: 'obra',
            motivo: 'Obra',
            nodos: ['entrada-ed-sur-oeste-sur', 'entrada-ed-sur-oeste-99'],
          },
        ],
      }),
    )
    const r = await promesa
    expect(r.fuente).toBe('red')
    expect(r.cierres[0]?.nodos).toEqual(['entrada-ed-sur-oeste-sur'])
    expect(advertir).toHaveBeenCalledWith(
      '[cierres] id desconocido: entrada-ed-sur-oeste-99 en el cierre obra',
    )
    expect(evitaElPaso(r.cierres)).toBe(true)
  })

  it('por defecto usa console.warn y la copia incluida en el bundle (public/data/cierres.json)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const r = await cargarCierres(grafo, {
        fetch: async () => Promise.reject(new Error('sin red')),
      })
      expect(r).toMatchObject({ fuente: 'incluida', cierres: [] })
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('[cierres] no se pudo descargar'))
    } finally {
      warn.mockRestore()
    }
  })
})

describe('origen de los cierres (tolerar-senal-irregular)', () => {
  const conCabeceras = (h: Record<string, string>) => async () => ({
    ...respuesta(structuredClone(ARCHIVO_EJEMPLO)),
    headers: new Headers(h),
  })

  it('red: la respuesta del servidor', async () => {
    const r = await cargar(conCabeceras({ Date: 'Thu, 22 Oct 2026 16:40:00 GMT' })).promesa
    expect(r).toMatchObject({ fuente: 'red', origen: 'red', guardadoEn: null })
  })

  it('caché: la copia que guardó el service worker, con su hora', async () => {
    const r = await cargar(
      conCabeceras({ 'X-DQ-Origen': 'cache', 'X-DQ-Guardado-En': '2026-10-22T16:40:00.000Z' }),
    ).promesa
    expect(r).toMatchObject({
      fuente: 'red',
      origen: 'cache',
      guardadoEn: '2026-10-22T16:40:00.000Z',
    })
  })

  it('respaldo: la copia incluida en el bundle, con su fecha `actualizado`', async () => {
    const advertir = vi.fn()
    const r = await cargarCierres(grafo, {
      fetch: () => Promise.reject(new TypeError('Failed to fetch')),
      advertir,
      respaldo: { ...RESPALDO, actualizado: '2026-10-22T13:40:00-03:00' },
    })
    expect(r).toMatchObject({
      fuente: 'incluida',
      origen: 'respaldo',
      guardadoEn: '2026-10-22T16:40:00.000Z',
    })
  })

  it('respaldo sin fecha', async () => {
    const r = await cargarCierres(grafo, {
      fetch: () => Promise.reject(new TypeError('Failed to fetch')),
      advertir: vi.fn(),
      respaldo: RESPALDO,
    })
    expect(r).toMatchObject({ origen: 'respaldo', guardadoEn: null })
  })
})
