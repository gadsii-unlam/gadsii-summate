import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { calcularRuta, type TramosExcluidos } from '../rutas/index.ts'
import { grafoReal } from '../rutas/test/datos-reales.ts'
import { crearClimaDeLaApp } from './app.ts'
import { crearOrquestadorRuta, type EstadoOrquestador } from './orquestacion.ts'
import type { FetchClima } from './servicio-simulado.ts'
import type { EstadoClima, ServicioClima } from './tipos.ts'

const ECO_HUM = { origen: ['puerta-aula-309'], destino: ['puerta-aula-103'] }

function archivo(nombre: string): string {
  if (nombre === 'error') return '{ "error": "servicio no disponible" }'
  return JSON.stringify({ fuente: 'simulado', llueve: nombre !== 'seco', descripcion: nombre })
}

const fetchSimulado: FetchClima = (url) => {
  const nombre = /(\w+)\.json$/.exec(url)?.[1] ?? ''
  return Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(archivo(nombre)) })
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Clima de la app con una pestaña nueva (sin `sessionStorage`). */
function climaDePrueba(busqueda: string) {
  return crearClimaDeLaApp({ busqueda, almacen: null, fetch: fetchSimulado })
}

function armar(busqueda: string, excluidos?: TramosExcluidos) {
  const clima = climaDePrueba(busqueda)
  const orq = crearOrquestadorRuta({ grafo: grafoReal(), servicio: clima.servicio, excluidos })
  const estados: EstadoOrquestador[] = []
  orq.suscribir((e) => estados.push(e))
  return { clima, orq, estados }
}

describe('orquestación', () => {
  it('con `lento` no entrega ninguna ruta antes de los 3 s', async () => {
    const { orq, estados } = armar('?clima=lento')
    const promesa = orq.calcular(ECO_HUM)
    expect(orq.estado().tipo).toBe('esperando-clima')
    await vi.advanceTimersByTimeAsync(2999)
    expect(orq.estado().tipo).toBe('esperando-clima')
    expect(estados.every((e) => e.tipo !== 'listo')).toBe(true)
    await vi.advanceTimersByTimeAsync(1)
    const plan = await promesa
    expect(plan?.estadoClima).toBe('llueve')
    expect(plan?.criterioPrincipal).toBe('resguardada')
    expect(estados.map((e) => e.tipo)).toEqual(['esperando-clima', 'listo'])
  })

  it('con cierres vigentes ninguna de las dos alternativas los cruza', async () => {
    const g = grafoReal()
    const sinCierre = calcularRuta(g, { ...ECO_HUM, criterio: 'mas-corta' })
    if (sinCierre.tipo !== 'ruta') throw new Error('sin ruta')
    const cerrada = sinCierre.aristas[Math.floor(sinCierre.aristas.length / 2)]!
    const resg = calcularRuta(g, { ...ECO_HUM, criterio: 'resguardada' })
    if (resg.tipo !== 'ruta') throw new Error('sin ruta')
    const nodoCerrado = resg.nodos[Math.floor(resg.nodos.length / 2)]!
    const excluidos = { nodos: new Set([nodoCerrado]), aristas: new Set([cerrada]) }

    const proveedor = vi.fn(() => Promise.resolve(excluidos))
    const clima = climaDePrueba('?clima=lluvia')
    const orq = crearOrquestadorRuta({ grafo: g, servicio: clima.servicio, excluidos: proveedor })
    await orq.calcular(ECO_HUM)
    const e = orq.estado()
    if (e.tipo !== 'listo') throw new Error('no listo')
    for (const r of [e.rutas.masCorta, e.rutas.resguardada]) {
      if (r.tipo !== 'ruta') throw new Error('sin ruta')
      expect(r.aristas).not.toContain(cerrada)
      expect(r.nodos).not.toContain(nodoCerrado)
    }
    expect(proveedor).toHaveBeenCalledTimes(1)
  })

  it('toma los excluidos del controlador de cierres en cada cálculo', async () => {
    const excluidos = { nodos: new Set(['puerta-aula-103']), aristas: new Set<string>() }
    const controlador = { reevaluar: vi.fn(() => ({ excluidos })) }
    const clima = climaDePrueba('?clima=seco')
    const orq = crearOrquestadorRuta({
      grafo: Promise.resolve(grafoReal()),
      servicio: clima.servicio,
      excluidos: () => controlador.reevaluar().excluidos,
    })
    const plan = await orq.calcular(ECO_HUM)
    expect(controlador.reevaluar).toHaveBeenCalledTimes(1)
    expect(plan?.principal).toMatchObject({ tipo: 'sin-ruta', motivo: 'destino-sin-puertas' })
    await orq.calcular(ECO_HUM)
    expect(controlador.reevaluar).toHaveBeenCalledTimes(2)
  })

  it('con el grafo todavía cargando espera y después calcula', async () => {
    let resolver: (g: ReturnType<typeof grafoReal>) => void = () => {}
    const grafo = new Promise<ReturnType<typeof grafoReal>>((r) => (resolver = r))
    const orq = crearOrquestadorRuta({ grafo, servicio: climaDePrueba('?clima=lluvia').servicio })
    const promesa = orq.calcular(ECO_HUM)
    await vi.advanceTimersByTimeAsync(10)
    expect(orq.estado().tipo).toBe('esperando-clima')
    resolver(grafoReal())
    await expect(promesa).resolves.toMatchObject({ criterioPrincipal: 'resguardada' })
  })

  it('un proveedor de cierres que falla no deja la consulta colgada', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const clima = climaDePrueba('?clima=seco')
    const orq = crearOrquestadorRuta({
      grafo: grafoReal(),
      servicio: clima.servicio,
      excluidos: () => Promise.reject(new Error('sin archivo')),
    })
    await expect(orq.calcular(ECO_HUM)).resolves.toMatchObject({ estadoClima: 'no-llueve' })
  })

  it('cambio de escenario seco → lluvia con la ruta en pantalla: pasa a la resguardada', async () => {
    const { clima, orq } = armar('?clima=seco')
    await orq.calcular(ECO_HUM)
    const antes = orq.estado()
    if (antes.tipo !== 'listo') throw new Error('no listo')
    expect(antes.plan.criterioPrincipal).toBe('mas-corta')

    const listo = new Promise<void>((resolver) =>
      orq.suscribir((e) => e.tipo === 'listo' && !e.actualizando && resolver()),
    )
    clima.alCambiarEscenario(() => void orq.recalcular())
    clima.control.elegir('lluvia')
    await listo
    const despues = orq.estado()
    if (despues.tipo !== 'listo') throw new Error('no listo')
    expect(despues.consulta).toBe(antes.consulta)
    expect(despues.plan.criterioPrincipal).toBe('resguardada')
    expect(despues.plan.etiquetaPrincipal).toBe('Más resguardada')
  })

  it('reintentar conserva origen, destino y la ruta ya mostrada mientras consulta', async () => {
    const { clima, orq, estados } = armar('?clima=error')
    await orq.calcular(ECO_HUM)
    orq.elegirCriterio('mas-corta')
    const mostrada = orq.estado()
    if (mostrada.tipo !== 'listo') throw new Error('no listo')
    expect(mostrada.plan.principal).toBe(mostrada.rutas.masCorta)

    clima.control.elegir('lento')
    const promesa = orq.reintentar()
    const durante = orq.estado()
    if (durante.tipo !== 'listo') throw new Error('debería seguir mostrando la ruta')
    expect(durante.actualizando).toBe(true)
    expect(durante.plan).toBe(mostrada.plan)
    expect(durante.consulta).toBe(mostrada.consulta)
    expect(estados.some((e, i) => i > 1 && e.tipo === 'esperando-clima')).toBe(false)

    await vi.advanceTimersByTimeAsync(3000)
    const plan = await promesa
    expect(plan?.estadoClima).toBe('llueve')
    expect(plan?.criterioPrincipal).toBe('resguardada')
    const final = orq.estado()
    expect(final.tipo === 'listo' && final.consulta).toBe(mostrada.consulta)
  })

  it('clima caído: pide elegir; la elección se recuerda al cambiar de destino', async () => {
    const { orq } = armar('?clima=error')
    const plan = await orq.calcular(ECO_HUM)
    expect(plan?.requiereEleccion).toBe(true)
    expect(plan?.principal).toBeNull()
    orq.elegirCriterio('resguardada')
    const e = orq.estado()
    expect(e.tipo === 'listo' && e.plan.criterioPrincipal).toBe('resguardada')
    const otro = await orq.calcular({ ...ECO_HUM, destino: ['puerta-lab-microscopia'] })
    expect(otro?.requiereEleccion).toBe(false)
    expect(otro?.criterioPrincipal).toBe('resguardada')
    expect(otro?.estadoClima).toBe('no-disponible')
  })

  it('un cálculo nuevo descarta el anterior que seguía esperando el clima', async () => {
    let llamadas = 0
    let resolverLento: ((e: EstadoClima) => void) | undefined
    const servicio: ServicioClima = {
      consultar: () => {
        llamadas++
        return llamadas === 1
          ? new Promise((r) => (resolverLento = r))
          : Promise.resolve({ tipo: 'no-disponible', motivo: 'red' })
      },
    }
    const orq = crearOrquestadorRuta({ grafo: grafoReal(), servicio })
    const primera = orq.calcular(ECO_HUM)
    const segunda = orq.calcular({ ...ECO_HUM, destino: ['puerta-aula-110'] })
    await expect(segunda).resolves.toMatchObject({ estadoClima: 'no-disponible' })
    resolverLento?.({ tipo: 'no-disponible', motivo: 'red' })
    await expect(primera).resolves.toBeNull()
    const e = orq.estado()
    expect(e.tipo === 'listo' && e.consulta.destino).toEqual(['puerta-aula-110'])
  })

  it('con clima ok, elegir criterio no se recuerda', async () => {
    const { orq } = armar('?clima=lluvia')
    await orq.calcular(ECO_HUM)
    orq.elegirCriterio('mas-corta')
    const e = orq.estado()
    expect(e.tipo === 'listo' && e.plan.criterioPrincipal).toBe('resguardada')
  })
})

describe('restaurar, previsualizar y aplicar (tolerar-senal-irregular)', () => {
  it('restaurar publica el plan guardado sin consultar el clima', () => {
    const consultar = vi.fn()
    const orq = crearOrquestadorRuta({ grafo: grafoReal(), servicio: { consultar } })
    const g = grafoReal()
    const masCorta = calcularRuta(g, { ...ECO_HUM, criterio: 'mas-corta' })
    const resguardada = calcularRuta(g, { ...ECO_HUM, criterio: 'resguardada' })
    const plan = orq.restaurar({
      consulta: ECO_HUM,
      clima: { tipo: 'no-disponible', motivo: 'red' },
      rutas: { masCorta, resguardada },
      criterioElegido: 'resguardada',
    })
    expect(consultar).not.toHaveBeenCalled()
    expect(orq.estado().tipo).toBe('listo')
    expect(plan.criterioPrincipal).toBe('resguardada')
    expect(plan.requiereEleccion).toBe(false)
  })

  it('previsualizar calcula sin publicar y aplicar lo publica', async () => {
    const { orq, clima, estados } = armar('?clima=seco')
    await orq.calcular(ECO_HUM)
    const antes = orq.estado()
    const cantidad = estados.length
    clima.control.elegir('lluvia')
    clima.servicio.invalidar()
    const previo = await orq.previsualizar()
    expect(previo?.plan.estadoClima).toBe('llueve')
    expect(orq.estado()).toBe(antes)
    expect(estados).toHaveLength(cantidad)
    expect(previo && orq.aplicar(previo)).toBe(true)
    const despues = orq.estado()
    expect(despues.tipo === 'listo' && despues.plan.estadoClima).toBe('llueve')
  })

  it('un cálculo nuevo invalida la previsualización en curso', async () => {
    const { orq } = armar('?clima=seco')
    await orq.calcular(ECO_HUM)
    const previo = orq.previsualizar()
    void orq.calcular({ origen: ['puerta-aula-103'], destino: ['puerta-aula-309'] })
    expect(await previo).toBeNull()
  })

  it('sin consulta, previsualizar devuelve null', async () => {
    const { orq } = armar('?clima=seco')
    expect(await orq.previsualizar()).toBeNull()
  })
})
