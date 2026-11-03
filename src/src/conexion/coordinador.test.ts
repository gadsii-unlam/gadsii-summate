import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearOrquestadorRuta, type EstadoClima, type ServicioClima } from '../clima/index.ts'
import type { RutaEncontrada, TramosExcluidos } from '../rutas/index.ts'
import { grafoReal } from '../rutas/test/datos-reales.ts'
import { crearCoordinadorConexion } from './coordinador.ts'
import { crearMonitorConexion, type VentanaConexion } from './estado.ts'

const CONSULTA = {
  origen: ['puerta-aula-309'],
  destino: ['puerta-aula-103'],
  origenId: 'aula-309',
  destinoId: 'aula-103',
}
const CLAVE = 'aula-309|aula-103'
const SECO: EstadoClima = {
  tipo: 'ok',
  llueve: false,
  descripcion: 'seco',
  fuente: 'simulado',
  obtenidoEn: '2026-10-22T16:00:00.000Z',
}

class VentanaFalsa implements VentanaConexion {
  oyentes = new Map<string, Set<() => void>>()
  navigator = { onLine: true }
  addEventListener(t: string, o: () => void) {
    if (!this.oyentes.has(t)) this.oyentes.set(t, new Set())
    this.oyentes.get(t)?.add(o)
  }
  removeEventListener(t: string, o: () => void) {
    this.oyentes.get(t)?.delete(o)
  }
  disparar(t: 'online' | 'offline') {
    for (const o of this.oyentes.get(t) ?? []) o()
  }
}

function armar() {
  let clima: EstadoClima = SECO
  let excluidos: TramosExcluidos = { nodos: new Set(), aristas: new Set() }
  const servicio: ServicioClima = { consultar: vi.fn(async () => clima) }
  const orquestador = crearOrquestadorRuta({
    grafo: grafoReal(),
    servicio,
    excluidos: () => excluidos,
  })
  const ventana = new VentanaFalsa()
  const monitor = crearMonitorConexion({ ventana })
  let mostrada: RutaEncontrada | null = null
  const recargarCierres = vi.fn(async () => ({ origen: 'red' as const }))
  const coordinador = crearCoordinadorConexion({
    monitor,
    orquestador,
    rutaMostrada: () =>
      mostrada ? { clave: CLAVE, criterio: 'mas-corta', elegida: mostrada } : null,
    recargarCierres,
    invalidarClima: vi.fn(),
    duracionAvisoMs: 1000,
    esperaReconexionMs: 100,
  })
  coordinador.rutaCambiada(CLAVE)
  return {
    orquestador,
    monitor,
    ventana,
    coordinador,
    recargarCierres,
    servicio,
    mostrar: (r: RutaEncontrada) => (mostrada = r),
    cerrar: (nodo: string) => (excluidos = { nodos: new Set([nodo]), aristas: new Set() }),
    climaCaido: () => (clima = { tipo: 'no-disponible', motivo: 'red' }),
  }
}

async function conRuta(a: ReturnType<typeof armar>) {
  await a.orquestador.calcular(CONSULTA)
  const e = a.orquestador.estado()
  if (e.tipo !== 'listo' || e.rutas.masCorta.tipo !== 'ruta') throw new Error('sin ruta')
  a.mostrar(e.rutas.masCorta)
  return e.rutas.masCorta
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('coordinador de conexión', () => {
  it('Reintentar sin cambios: no toca la ruta ni avisa', async () => {
    const a = armar()
    await conRuta(a)
    const antes = a.orquestador.estado()
    await a.coordinador.reintentar()
    expect(a.recargarCierres).toHaveBeenCalledTimes(1)
    expect(a.orquestador.estado()).toBe(antes)
    expect(a.coordinador.estado()).toMatchObject({ reintentando: false, rutaActualizada: false })
  })

  it('Reintentar con un cierre nuevo en la ruta: la aplica y avisa (y el aviso se va solo)', async () => {
    const a = armar()
    const ruta = await conRuta(a)
    const nodo = ruta.nodos[Math.floor(ruta.nodos.length / 2)]!
    a.cerrar(nodo)
    await a.coordinador.reintentar()
    const e = a.orquestador.estado()
    expect(
      e.tipo === 'listo' && e.plan.principal?.tipo === 'ruta' && e.plan.principal.nodos,
    ).not.toContain(nodo)
    expect(a.coordinador.estado().rutaActualizada).toBe(true)
    await vi.advanceTimersByTimeAsync(1000)
    expect(a.coordinador.estado().rutaActualizada).toBe(false)
  })

  it('Reintentar sin red (clima caído por red): no reemplaza la ruta', async () => {
    const a = armar()
    const ruta = await conRuta(a)
    a.cerrar(ruta.nodos[3]!)
    a.climaCaido()
    const antes = a.orquestador.estado()
    await a.coordinador.reintentar()
    expect(a.orquestador.estado()).toBe(antes)
  })

  it('al volver la red con un tramo cerrado: no reemplaza, avisa y "Ver ruta actualizada" aplica', async () => {
    const a = armar()
    const ruta = await conRuta(a)
    const nodo = ruta.nodos[3]!
    a.cerrar(nodo)
    const antes = a.orquestador.estado()
    a.ventana.disparar('online')
    await vi.waitFor(() => expect(a.coordinador.estado().cambio).toBe('tramo-cerrado'))
    expect(a.orquestador.estado()).toBe(antes)
    a.coordinador.verRutaActualizada()
    const e = a.orquestador.estado()
    expect(e).not.toBe(antes)
    expect(
      e.tipo === 'listo' && e.plan.principal?.tipo === 'ruta' && e.plan.principal.nodos,
    ).not.toContain(nodo)
    expect(a.coordinador.estado()).toMatchObject({ cambio: null, rutaActualizada: true })
  })

  it('al volver la red sin cambios: nada que avisar', async () => {
    const a = armar()
    await conRuta(a)
    a.ventana.disparar('online')
    await vi.waitFor(() => expect(a.recargarCierres).toHaveBeenCalled())
    await vi.advanceTimersByTimeAsync(0)
    expect(a.coordinador.estado().cambio).toBeNull()
  })

  it('cambiar de ruta descarta el cambio pendiente', async () => {
    const a = armar()
    const ruta = await conRuta(a)
    a.cerrar(ruta.nodos[3]!)
    await a.coordinador.actualizarEnSegundoPlano()
    expect(a.coordinador.estado().cambio).toBe('tramo-cerrado')
    a.coordinador.rutaCambiada('otro|lugar')
    expect(a.coordinador.estado().cambio).toBeNull()
  })

  it('si la red sigue sin responder después de online, reintenta solo', async () => {
    const a = armar()
    await conRuta(a)
    a.monitor.reportarFalla(new TypeError('Failed to fetch'))
    a.ventana.disparar('online')
    await vi.advanceTimersByTimeAsync(0)
    await vi.advanceTimersByTimeAsync(100)
    await vi.advanceTimersByTimeAsync(100)
    expect(a.recargarCierres.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('registra el origen de los cierres de la recarga', async () => {
    const a = armar()
    a.recargarCierres.mockResolvedValueOnce({
      origen: 'cache',
      guardadoEn: '2026-10-22T16:40:00.000Z',
    } as never)
    await a.coordinador.reintentar()
    expect(a.coordinador.estado().origenCierres).toEqual({
      origen: 'cache',
      guardadoEn: '2026-10-22T16:40:00.000Z',
    })
  })
})
