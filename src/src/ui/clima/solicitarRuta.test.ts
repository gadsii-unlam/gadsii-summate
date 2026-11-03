import { describe, expect, it } from 'vitest'
import { crearOrquestadorRuta, type ServicioClima } from '../../clima/index.ts'
import { grafoReal } from '../../rutas/test/datos-reales.ts'
import { crearSolicitarRuta } from './solicitarRuta.ts'

const SECO: ServicioClima = {
  consultar: () =>
    Promise.resolve({
      tipo: 'ok',
      llueve: false,
      descripcion: 'Sin lluvia',
      fuente: 'simulado',
      obtenidoEn: '2026-11-05T13:00:00.000Z',
    }),
}
const LUGARES = {
  porId: new Map([
    ['economicas-309', { puertas: ['puerta-economicas-309'] }],
    ['humanidades-103', { puertas: ['puerta-humanidades-103'] }],
    ['humanidades-110', { puertas: ['puerta-humanidades-110'] }],
  ]),
}

describe('solicitarRuta sobre el orquestador', () => {
  it('traduce los lugares a sus puertas y guarda sus ids en la consulta', async () => {
    const orq = crearOrquestadorRuta({ grafo: grafoReal(), servicio: SECO })
    const solicitar = crearSolicitarRuta(orq, LUGARES)
    solicitar({
      origen: 'economicas-309',
      destino: 'humanidades-103',
      signal: new AbortController().signal,
    })
    const e = orq.estado()
    expect(e.tipo).toBe('esperando-clima')
    expect(e.tipo !== 'inactivo' && e.consulta).toMatchObject({
      origen: ['puerta-economicas-309'],
      destino: ['puerta-humanidades-103'],
      origenId: 'economicas-309',
      destinoId: 'humanidades-103',
    })
  })

  it('abortar el pedido vigente vuelve a inactivo; abortar uno viejo no toca el nuevo', async () => {
    const orq = crearOrquestadorRuta({ grafo: grafoReal(), servicio: SECO })
    const solicitar = crearSolicitarRuta(orq, LUGARES)
    const viejo = new AbortController()
    solicitar({ origen: 'economicas-309', destino: 'humanidades-103', signal: viejo.signal })
    const nuevo = new AbortController()
    solicitar({ origen: 'economicas-309', destino: 'humanidades-110', signal: nuevo.signal })
    viejo.abort()
    expect(orq.estado().tipo).toBe('esperando-clima')
    await new Promise((r) => setTimeout(r, 0))
    const e = orq.estado()
    expect(e.tipo === 'listo' && e.consulta.destinoId).toBe('humanidades-110')
    nuevo.abort()
    expect(orq.estado().tipo).toBe('inactivo')
  })

  it('ignora pedidos ya abortados o con lugares desconocidos', () => {
    const orq = crearOrquestadorRuta({ grafo: grafoReal(), servicio: SECO })
    const solicitar = crearSolicitarRuta(orq, LUGARES)
    const c = new AbortController()
    c.abort()
    solicitar({ origen: 'economicas-309', destino: 'humanidades-103', signal: c.signal })
    solicitar({ origen: 'x', destino: 'humanidades-103', signal: new AbortController().signal })
    expect(orq.estado().tipo).toBe('inactivo')
  })
})
