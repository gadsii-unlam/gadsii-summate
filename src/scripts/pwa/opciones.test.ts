import { describe, expect, it } from 'vitest'
import { CABECERA_GUARDADO_EN, CABECERA_ORIGEN, PLUGIN_ORIGEN_CIERRES } from './opciones.ts'

describe('plugin de origen de los cierres', () => {
  it('al guardar marca la hora y conserva el cuerpo', async () => {
    const r = await PLUGIN_ORIGEN_CIERRES.cacheWillUpdate({
      response: new Response('{"cierres":[]}', { status: 200, headers: { 'X-Otra': '1' } }),
    })
    expect(r?.headers.get(CABECERA_GUARDADO_EN)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(r?.headers.get('X-Otra')).toBe('1')
    expect(r?.headers.get(CABECERA_ORIGEN)).toBeNull()
    expect(await r?.text()).toBe('{"cierres":[]}')
  })

  it('no guarda respuestas que no son 200', async () => {
    expect(
      await PLUGIN_ORIGEN_CIERRES.cacheWillUpdate({ response: new Response('', { status: 404 }) }),
    ).toBeNull()
  })

  it('al responder desde la caché agrega el origen', async () => {
    const guardada = new Response('{}', {
      status: 200,
      headers: { [CABECERA_GUARDADO_EN]: '2026-10-22T16:40:00.000Z' },
    })
    const r = await PLUGIN_ORIGEN_CIERRES.cachedResponseWillBeUsed({ cachedResponse: guardada })
    expect(r?.headers.get(CABECERA_ORIGEN)).toBe('cache')
    expect(r?.headers.get(CABECERA_GUARDADO_EN)).toBe('2026-10-22T16:40:00.000Z')
    expect(await r?.text()).toBe('{}')
    expect(await PLUGIN_ORIGEN_CIERRES.cachedResponseWillBeUsed({})).toBeUndefined()
  })

  it('las funciones no usan nada de afuera (Workbox las copia con toString)', () => {
    const codigo = Object.values(PLUGIN_ORIGEN_CIERRES)
      .map((f) => f.toString())
      .join('\n')
    expect(codigo).not.toMatch(/CABECERA_|import|require\(/)
    expect(codigo).toMatch(/['"]X-DQ-Guardado-En['"]/)
    expect(codigo).toMatch(/['"]X-DQ-Origen['"]/)
  })
})
