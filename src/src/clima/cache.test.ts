import { describe, expect, it, vi } from 'vitest'
import { conCacheDeClima } from './cache.ts'
import type { EstadoClima } from './tipos.ts'

const LLUVIA: EstadoClima = {
  tipo: 'ok',
  llueve: true,
  descripcion: 'lluvia',
  fuente: 'simulado',
  obtenidoEn: '2026-10-22T16:00:00.000Z',
}

describe('conCacheDeClima sin conexión', () => {
  it('con conexión reutiliza el ok; sin conexión vuelve a la red y no devuelve el lluvia anterior', async () => {
    let offline = false
    const consultar = vi
      .fn<() => Promise<EstadoClima>>()
      .mockResolvedValueOnce(LLUVIA)
      .mockResolvedValue({ tipo: 'no-disponible', motivo: 'red' })
    const servicio = conCacheDeClima(
      { consultar },
      { escenario: () => 'lluvia', ahora: () => 0, omitirGuardado: () => offline },
    )
    expect(await servicio.consultar()).toBe(LLUVIA)
    expect(await servicio.consultar()).toBe(LLUVIA)
    expect(consultar).toHaveBeenCalledTimes(1)
    offline = true
    expect(await servicio.consultar()).toEqual({ tipo: 'no-disponible', motivo: 'red' })
    offline = false
    // El lluvia guardado se descartó: la próxima consulta también va a la red.
    await servicio.consultar()
    expect(consultar).toHaveBeenCalledTimes(3)
  })
})
