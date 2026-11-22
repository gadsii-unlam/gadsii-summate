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

  /** Elige en la búsqueda del panel y espera a que el historial vuelva al panel. */
  async function elegirEnBusqueda(campo: 'origen' | 'destino', lugarId: string) {
    c.despachar({ tipo: 'abrir-busqueda', campo })
    const volvio = esperarPopstate()
    c.despachar({ tipo: 'elegir-resultado', lugarId })
    await volvio
  }

  it('arranca en "Cómo llegar", sin hash y sin entradas extra en el historial', () => {
    crear()
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    expect(window.history.state).toMatchObject({ profundidad: 0 })
    expect(window.location.hash).toBe('')
  })

  it('elegir destino y origen en la búsqueda vuelve al panel y pide la ruta una vez', async () => {
    crear()
    await elegirEnBusqueda('destino', 'humanidades-121')
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    expect(pedidos).toHaveLength(0)
    await elegirEnBusqueda('origen', 'servicios-biblioteca')
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    expect(pedidos.map((p) => [p.origen, p.destino])).toEqual([
      ['servicios-biblioteca', 'humanidades-121'],
    ])
    expect(c.obtener().fase).toBe('ruta')
  })

  it('en celular, elegir el origen sin destino pasa a buscar el destino en la misma entrada', () => {
    crear()
    c.despachar({ tipo: 'abrir-busqueda', campo: 'origen' })
    const largo = window.history.length
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'servicios-biblioteca' })
    expect(c.obtener().pantalla.vista).toEqual({
      tipo: 'buscando',
      campo: 'destino',
      desde: 'como-llegar',
    })
    expect(window.history.length).toBe(largo)
    expect(window.history.state).toMatchObject({ profundidad: 1 })
  })

  it('en PC, elegir el origen sin destino vuelve al panel (lo que falta va en la barra lateral)', async () => {
    crear()
    c.usarEscritorio(true)
    await elegirEnBusqueda('origen', 'servicios-biblioteca')
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    expect(c.obtener().pantalla.seleccion.origen).toBe('servicios-biblioteca')
  })

  it('abrir y cerrar la búsqueda sin elegir no repite el pedido; cambiar el origen sí', async () => {
    crear()
    c.despachar({ tipo: 'elegir-destino', lugarId: 'humanidades-121' })
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
    c.despachar({ tipo: 'elegir-destino', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-biblioteca' })
    c.despachar({ tipo: 'borrar-destino' })
    expect(pedidos).toHaveLength(1)
    expect(pedidos[0]?.signal.aborted).toBe(true)
    expect(c.obtener().pedido).toBeNull()
    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-teatro' })
    expect(pedidos).toHaveLength(1)
  })

  it('Cancelar borra origen y destino y cancela el pedido', () => {
    crear()
    c.despachar({ tipo: 'elegir-destino', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-biblioteca' })
    c.despachar({ tipo: 'limpiar' })
    expect(c.obtener().pantalla.seleccion).toMatchObject({ origen: null, destino: null })
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    expect(pedidos[0]?.signal.aborted).toBe(true)
    expect(c.obtener().pedido).toBeNull()
  })

  it('guarda el último origen al pedir una ruta y lo ofrece como sugerencia la próxima vez', () => {
    crear()
    c.despachar({ tipo: 'elegir-destino', lugarId: 'humanidades-121' })
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

  it('✕ vuelve al panel con history.go(-profundidad)', async () => {
    crear()
    c.despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
    c.despachar({ tipo: 'abrir-ayuda' })
    const go = vi.spyOn(window.history, 'go')
    const p = esperarPopstate()
    c.cerrar()
    await p
    expect(go).toHaveBeenCalledWith(-2)
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    go.mockRestore()
  })

  it('volver usa history.back() y la vista cambia solo en popstate', async () => {
    crear()
    c.despachar({ tipo: 'abrir-busqueda', campo: 'destino' })
    c.despachar({ tipo: 'escribir', consulta: '121' })
    c.despachar({ tipo: 'abrir-ayuda' })
    const back = vi.spyOn(window.history, 'back')
    const p = esperarPopstate()
    c.volver()
    expect(back).toHaveBeenCalledTimes(1)
    expect(c.obtener().pantalla.vista.tipo).toBe('ayuda')
    await p
    expect(c.obtener().pantalla.vista.tipo).toBe('buscando')
    expect(c.obtener().pantalla.consulta).toBe('121')
    back.mockRestore()
  })

  it('volver en el panel no hace nada', () => {
    crear()
    const back = vi.spyOn(window.history, 'back')
    c.volver()
    expect(back).not.toHaveBeenCalled()
    back.mockRestore()
  })

  it('carga en frío con un hash: el panel + la vista pedida, y Atrás muestra el panel', async () => {
    crear('#buscar')
    expect(c.obtener().pantalla.vista).toEqual({
      tipo: 'buscando',
      campo: 'destino',
      desde: 'como-llegar',
    })
    expect(window.history.state).toMatchObject({ profundidad: 1 })
    await atras()
    expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
    expect(window.location.hash).toBe('')
  })

  it.each(['#lo-que-sea', '#lugar/puerta-humanidades-121'])(
    'un hash desconocido o un enlace viejo a una ficha (%s) caen en el panel',
    (hash) => {
      crear(hash)
      expect(c.obtener().pantalla.vista).toEqual({ tipo: 'como-llegar' })
      expect(window.location.hash).toBe('')
    },
  )

  it('conectar dos veces (modo estricto) no duplica entradas', () => {
    crear('#buscar')
    const largo = window.history.length
    desconectar()
    desconectar = c.conectar()
    expect(window.history.length).toBe(largo)
  })

  it('los recientes de destino y de origen se guardan por separado', async () => {
    crear()
    // Celular: elegir el origen pasa a buscar el destino en la misma entrada.
    c.despachar({ tipo: 'abrir-busqueda', campo: 'origen' })
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'servicios-biblioteca' })
    const p = esperarPopstate()
    c.despachar({ tipo: 'elegir-resultado', lugarId: 'aula-302' })
    await p
    expect(c.obtener().recientes).toEqual(['aula-302'])
    expect(c.obtener().recientesOrigen).toEqual(['servicios-biblioteca'])
    // Desde la lista del panel (PC) también cuentan.
    c.despachar({ tipo: 'elegir-destino', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-teatro' })
    expect(c.obtener().recientes).toEqual(['humanidades-121', 'aula-302'])
    expect(c.obtener().recientesOrigen).toEqual(['servicios-teatro', 'servicios-biblioteca'])
    desconectar()
    crear()
    expect(c.obtener().recientes).toEqual(['humanidades-121', 'aula-302'])
    expect(c.obtener().recientesOrigen).toEqual(['servicios-teatro', 'servicios-biblioteca'])
  })

  it('quitar un reciente lo saca de su lista y del almacenamiento', () => {
    crear()
    c.despachar({ tipo: 'elegir-destino', lugarId: 'humanidades-121' })
    c.despachar({ tipo: 'elegir-origen', lugarId: 'servicios-teatro' })
    c.quitarReciente('destino', 'humanidades-121')
    expect(c.obtener().recientes).toEqual([])
    expect(c.obtener().recientesOrigen).toEqual(['servicios-teatro'])
    c.quitarReciente('origen', 'servicios-teatro')
    expect(c.obtener().recientesOrigen).toEqual([])
    desconectar()
    crear()
    expect(c.obtener().recientes).toEqual([])
    expect(c.obtener().recientesOrigen).toEqual([])
  })

  it('PC: el campo activo y su texto se reinician al cambiar la selección', () => {
    crear()
    c.elegirCampoPanel('destino')
    c.escribirPanel('121')
    expect(c.obtener()).toMatchObject({ campoPanel: 'destino', consultaPanel: '121' })
    c.despachar({ tipo: 'elegir-destino', lugarId: 'humanidades-121' })
    expect(c.obtener()).toMatchObject({ campoPanel: null, consultaPanel: '' })
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
    // "Cómo llegar" es la vista de base: no suma una entrada ni un hash.
    expect(window.location.hash).toBe('')
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
