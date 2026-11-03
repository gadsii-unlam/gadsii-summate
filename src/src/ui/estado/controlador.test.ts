import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVES, crearAlmacenEnMemoria } from './almacen.ts'
import type { Almacen } from './almacen.ts'
import { ControladorPantalla } from './controlador.ts'
import type { PedidoRuta } from './controlador.ts'

const LUGARES = new Set(['humanidades-121', 'servicios-biblioteca', 'servicios-teatro', 'aula-302'])

function esperarPopstate(): Promise<void> {
  return new Promise((r) => window.addEventListener('popstate', () => r(), { once: true }))
}

async function atras() {
  const p = esperarPopstate()
  window.history.back()
  await p
}

describe('ControladorPantalla + history', () => {
  let almacen: Almacen
  let pedidos: PedidoRuta[]
  let desconectar: () => void
  let c: ControladorPantalla

  function crear(hash = '') {
    window.history.replaceState(null, '', `/${hash}`)
    c = new ControladorPantalla({
      existeLugar: (id) => LUGARES.has(id),
      almacen,
      solicitarRuta: (p) => {
        pedidos.push(p)
      },
    })
    desconectar = c.conectar()
  }

  beforeEach(() => {
    almacen = crearAlmacenEnMemoria()
    pedidos = []
  })
  afterEach(() => desconectar())

  it('avanzar hace pushState con la vista y la profundidad', () => {
    crear()
    const antes = window.history.length
    c.despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
    expect(window.history.length).toBe(antes + 1)
    expect(window.history.state).toMatchObject({
      dq: 1,
      profundidad: 1,
      vista: { tipo: 'buscando' },
    })
    expect(window.location.hash).toBe('#buscar')
  })

  it('Atrás desde la ruta vuelve a la ficha sin pedir otra ruta', async () => {
    crear()
    c.despachar({ tipo: 'abrir-ficha', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'abrir-como-llegar' })
    c.despachar({ tipo: 'abrir-busqueda', campo: 'origen' })
    const volvio = esperarPopstate()
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'servicios-biblioteca' })
    await volvio
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    expect(pedidos.map((p) => [p.origen, p.destino])).toEqual([
      ['servicios-biblioteca', 'humanidades-121'],
    ])
    expect(c.obtener().fase).toBe('ruta')

    await atras()
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'ficha', lugarId: 'humanidades-121' })
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]?.signal.aborted).toBe(true)
    // La selección no se deshace.
    expect(c.obtener().pantalla.seleccion.origen).toBe('servicios-biblioteca')
  })

  it('abrir y cerrar la búsqueda sin elegir no repite el pedido; cambiar el origen sí', async () => {
    crear()
    c.despachar({ tipo: 'abrir-ficha', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'abrir-como-llegar' })
    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-biblioteca' })
    expect(pedidos).toHaveLength(1)

    c.despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
    await atras()
    expect(c.obtener().pantalla.vista.tipo).toBe('como-llegar')
    expect(pedidos).toHaveLength(1)

    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-teatro' })
    expect(pedidos.map((p) => p.origen)).toEqual(['servicios-biblioteca', 'servicios-teatro'])
    expect(pedidos[0]?.signal.aborted).toBe(true)
    expect(pedidos[1]?.signal.aborted).toBe(false)
  })

  it('borrar el destino cancela el pedido y no pide nada', () => {
    crear()
    c.despachar({ tipo: 'abrir-ficha', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'abrir-como-llegar' })
    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-biblioteca' })
    c.despachar({ tipo: 'borrar-destino' })
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]?.signal.aborted).toBe(true)
    expect(c.obtener().pedido).toBeNull()
    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-teatro' })
    expect(pedidos).toHaveLength(1)
  })

  it('guarda el último origen al pedir una ruta y lo ofrece como sugerencia la próxima vez', () => {
    crear()
    c.despachar({ tipo: 'abrir-ficha', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'abrir-como-llegar' })
    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-teatro' })
    expect(almacen.leer(CLAVES.ultimoOrigen, (v): v is string => typeof v === 'string')).toBe(
      'servicios-teatro',
    )
    desconectar()
    crear()
    expect(c.obtener().pantalla.seleccion).toMatchObject({
      origen: null,
      sugerenciaOrigen: 'servicios-teatro',
    })
  })

  it('✕ vuelve al inicio con history.go(-profundidad)', async () => {
    crear()
    c.despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'abrir-como-llegar' })
    const go = vi.spyOn(window.history, 'go')
    const p = esperarPopstate()
    c.cerrar()
    await p
    expect(go).toHaveBeenCalledWith(-3)
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'inicio' })
    go.mockRestore()
  })

  it('volver usa history.back() y la vista cambia solo en popstate', async () => {
    crear()
    c.despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
    c.despachar({ tipo: 'escribir', consulta: '121' })
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'humanidades-121' })
    const back = vi.spyOn(window.history, 'back')
    const p = esperarPopstate()
    c.volver()
    expect(back).toHaveBeenCalledTimes(1)
    expect(c.obtener().pantalla.vista.tipo).toBe('ficha')
    await p
    expect(c.obtener().pantalla.vista.tipo).toBe('buscando')
    expect(c.obtener().pantalla.consulta).toBe('121')
    back.mockRestore()
  })

  it('volver a la primera búsqueda después de buscar el origen conserva lo escrito', async () => {
    crear()
    c.despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
    c.despachar({ tipo: 'escribir', consulta: '121' })
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'abrir-como-llegar' })
    c.despachar({ tipo: 'abrir-busqueda', campo: 'origen' })
    const p = esperarPopstate()
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'servicios-biblioteca' })
    await p
    await atras() // ficha
    await atras() // búsqueda
    expect(c.obtener().pantalla.vista.tipo).toBe('buscando')
    expect(c.obtener().pantalla.consulta).toBe('121')
  })

  it('carga en frío con un hash: inicio + la vista pedida, y Atrás muestra el inicio', async () => {
    crear('#lugar/puerta-humanidades-121')
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'ficha', lugarId: 'humanidades-121' })
    expect(window.history.state).toMatchObject({ profundidad: 1 })
    await atras()
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'inicio' })
    expect(window.location.hash).toBe('')
  })

  it('un hash desconocido cae en el inicio', () => {
    crear('#lo-que-sea')
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'inicio' })
    expect(window.location.hash).toBe('')
  })

  it('conectar dos veces (modo estricto) no duplica entradas', () => {
    crear('#lugar/humanidades-121')
    const largo = window.history.length
    desconectar()
    desconectar = c.conectar()
    expect(window.history.length).toBe(largo)
  })

  it('los recientes se guardan al abrir una ficha y al elegir destino, no al elegir origen', async () => {
    crear()
    c.despachar({ tipo: 'abrir-ficha', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'abrir-como-llegar' })
    c.despachar({ tipo: 'abrir-busqueda', campo: 'origen' })
    let p = esperarPopstate()
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'servicios-biblioteca' })
    await p
    expect(c.obtener().recientes).toEqual(['humanidades-121'])
    c.despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
    p = esperarPopstate()
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'aula-302' })
    await p
    expect(c.obtener().recientes).toEqual(['aula-302', 'humanidades-121'])
  })

  it('cerrar la indicación de primer uso se recuerda', () => {
    crear()
    expect(c.obtener().primerUsoCerrado).toBe(false)
    c.cerrarPrimerUso()
    desconectar()
    crear()
    expect(c.obtener().primerUsoCerrado).toBe(true)
  })

  it('restaura una selección vigente sin pedir confirmación', () => {
    window.history.replaceState(null, '', '/')
    c = new ControladorPantalla({
      existeLugar: (id) => LUGARES.has(id),
      almacen,
      solicitarRuta: (p) => {
        pedidos.push(p)
      },
      seleccionInicial: { origen: 'servicios-biblioteca', destino: 'humanidades-121' },
    })
    desconectar = c.conectar()
    expect(c.obtener().pantalla.seleccion).toMatchObject({
      origen: 'servicios-biblioteca',
      destino: 'humanidades-121',
    })
  })

  it('con abrirComoLlegar abre el panel y pide la ruta al conectar (recorrido restaurado)', () => {
    window.history.replaceState(null, '', '/')
    c = new ControladorPantalla({
      existeLugar: (id) => LUGARES.has(id),
      almacen,
      solicitarRuta: (p) => {
        pedidos.push(p)
      },
      seleccionInicial: { origen: 'servicios-biblioteca', destino: 'humanidades-121' },
      abrirComoLlegar: true,
    })
    desconectar = c.conectar()
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    expect(window.location.hash).toBe('#como-llegar')
    expect(pedidos.map((p) => [p.origen, p.destino])).toEqual([
      ['servicios-biblioteca', 'humanidades-121'],
    ])
  })

  it('con abrirComoLlegar y solo un destino abre el panel sin pedir ruta', () => {
    window.history.replaceState(null, '', '/')
    c = new ControladorPantalla({
      existeLugar: (id) => LUGARES.has(id),
      almacen,
      solicitarRuta: (p) => {
        pedidos.push(p)
      },
      seleccionInicial: { origen: null, destino: 'humanidades-121' },
      abrirComoLlegar: true,
    })
    desconectar = c.conectar()
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    expect(pedidos).toEqual([])
  })
})
