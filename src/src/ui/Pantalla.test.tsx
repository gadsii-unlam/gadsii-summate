import { act, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVES, crearAlmacen, crearAlmacenEnMemoria } from './estado/almacen.ts'
import { ANCHO_ESCRITORIO } from './hooks.ts'
import type { EstadoAcceso, PedidoRuta } from './integraciones.ts'
import { TEXTOS } from './textos.ts'
import { esperarPopstate, renderizarPantalla } from './test/renderizar.tsx'

type Usuario = ReturnType<typeof renderizarPantalla>['usuario']

function pedidos() {
  const lista: PedidoRuta[] = []
  const solicitarRuta = vi.fn((p: PedidoRuta) => {
    lista.push(p)
  })
  return { lista, solicitarRuta }
}

/** Almacén con un destino reciente. */
function almacenConReciente(id = 'humanidades-121') {
  const a = crearAlmacenEnMemoria()
  a.escribir(CLAVES.recientes, [{ id, cuando: 1 }])
  return a
}

function campoOrigen(nombre: string | null = null) {
  return screen.getByRole('button', { name: TEXTOS.campoOrigen(nombre) })
}

function campoDestino(nombre: string | null = null) {
  return screen.getByRole('button', { name: TEXTOS.campoDestino(nombre) })
}

/** Celular: elige el destino desde su búsqueda y espera a volver al panel. */
async function elegirDestino(usuario: Usuario, texto: string, nombre: string) {
  await usuario.click(screen.getByRole('button', { name: /^Destino:/ }))
  await usuario.type(screen.getByRole('combobox'), texto)
  const p = esperarPopstate()
  await usuario.click(screen.getByRole('option', { name: new RegExp(`^${nombre}`) }))
  await act(() => p)
}

/** Celular: elige el origen desde su búsqueda (con el destino ya elegido vuelve al panel). */
async function elegirOrigen(usuario: Usuario, texto: string, nombre: string) {
  await usuario.click(screen.getByRole('button', { name: /^Punto de partida:/ }))
  await usuario.type(screen.getByRole('combobox'), texto)
  const p = esperarPopstate()
  await usuario.click(screen.getByRole('option', { name: new RegExp(`^${nombre}`) }))
  await act(() => p)
}

/** Celular: Teatro como destino y Biblioteca como origen (fase ruta). */
async function armarRuta(usuario: Usuario) {
  await elegirDestino(usuario, 'teatro', 'Teatro')
  await elegirOrigen(usuario, 'biblio', 'Biblioteca')
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('inicio: "Cómo llegar"', () => {
  it('abre directo en el panel con origen y destino vacíos, sin barra ni chips', () => {
    renderizarPantalla({ almacen: almacenConReciente() })
    expect(campoOrigen()).toHaveTextContent(TEXTOS.origenVacio)
    expect(campoDestino()).toHaveTextContent(TEXTOS.destinoVacio)
    expect(screen.getByRole('region', { name: TEXTOS.mapa })).toBeInTheDocument()
    expect(screen.queryByRole('search')).toBeNull()
    expect(screen.queryByRole('list', { name: TEXTOS.chipsNombre })).toBeNull()
    expect(screen.queryByRole('button', { name: TEXTOS.volver })).toBeNull()
    expect(window.location.hash).toBe('')
  })

  it('el doble del mapa se usa sin cargar Leaflet', () => {
    renderizarPantalla()
    expect(screen.getByTestId('mapa-doble')).toBeInTheDocument()
    expect((window as unknown as { L?: unknown }).L).toBeUndefined()
  })

  it('un enlace viejo a una ficha abre el panel vacío', () => {
    renderizarPantalla({ hash: '#lugar/humanidades-121' })
    expect(campoDestino()).toHaveTextContent(TEXTOS.destinoVacio)
    expect(screen.getByTestId('mapa-doble')).toHaveAttribute('data-encuadre', 'campus')
  })
})

describe('celular: sin hoja inferior', () => {
  function sinHoja() {
    expect(document.querySelector('.hoja')).toBeNull()
    expect(screen.queryByRole('button', { name: TEXTOS.manija })).toBeNull()
  }

  it('no hay hoja deslizable en ningún momento del recorrido', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    sinHoja()
    await elegirDestino(usuario, 'teatro', 'Teatro')
    sinHoja()
    await elegirOrigen(usuario, 'biblio', 'Biblioteca')
    sinHoja()
    await usuario.click(screen.getByRole('button', { name: TEXTOS.ayuda }))
    sinHoja()
  })

  it('las listas del panel quedan montadas pero ocultas (dibujan la ruta en el mapa)', async () => {
    const { usuario } = renderizarPantalla()
    await armarRuta(usuario)
    const ruta = screen.getByTestId('contenido-ruta')
    expect(ruta.closest('[hidden]')).not.toBeNull()
  })

  it('sin ruta no hay acción abajo; con ruta, "Cancelar" centrado', async () => {
    const { usuario } = renderizarPantalla()
    expect(document.querySelector('.accion-inferior')).toBeNull()
    await armarRuta(usuario)
    const accion = document.querySelector<HTMLElement>('.accion-inferior')!
    expect(within(accion).getByRole('button', { name: TEXTOS.cancelar })).toBeInTheDocument()
  })

  it('el mapa reserva abajo solo el alto de los botones flotantes', () => {
    renderizarPantalla()
    const mapa = screen.getByTestId('mapa-doble')
    // jsdom no mide: sin alto de botones no se reserva nada (antes era el alto de la hoja).
    expect(Number(mapa.dataset.margenAbajo)).toBe(0)
  })
})

describe('búsqueda', () => {
  it('abre a pantalla completa con el foco en el campo y el patrón combobox', async () => {
    renderizarPantalla({ almacen: almacenConReciente(), hash: '#buscar' })
    const dialogo = screen.getByRole('dialog', { name: TEXTOS.buscarLugar })
    expect(dialogo).toHaveAttribute('aria-modal', 'true')
    const campo = within(dialogo).getByRole('combobox')
    expect(campo).toHaveFocus()
    expect(campo).toHaveAttribute('aria-autocomplete', 'list')
    const lista = within(dialogo).getByRole('listbox')
    expect(campo).toHaveAttribute('aria-controls', lista.id)
    // Vacía: ejemplo, recientes y referencias.
    expect(within(dialogo).getByText(TEXTOS.ejemploBusqueda)).toBeInTheDocument()
    expect(within(dialogo).getByRole('group', { name: TEXTOS.recientes })).toBeInTheDocument()
    expect(within(dialogo).getByRole('group', { name: TEXTOS.referencias })).toBeInTheDocument()
  })

  it('filtra al tipear, resalta la coincidencia y muestra "Edificio · Categoría"', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    await usuario.type(screen.getByRole('combobox'), '121')
    const opciones = screen.getAllByRole('option')
    expect(opciones[0]).toHaveTextContent('Aula 121')
    expect(opciones[0]).toHaveTextContent('Humanidades · Aula')
    expect(opciones[0]?.querySelector('strong')).toHaveTextContent('121')
    expect(screen.queryByText(TEXTOS.ejemploBusqueda)).toBeNull()
  })

  it('las flechas mueven aria-activedescendant y Enter elige el destino', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    const campo = screen.getByRole('combobox')
    await usuario.type(campo, '12')
    await usuario.keyboard('{ArrowDown}{ArrowDown}')
    const activa = document.getElementById(campo.getAttribute('aria-activedescendant') ?? '')
    expect(activa).toHaveAttribute('aria-selected', 'true')
    expect(activa).toHaveTextContent('Aula 121')
    const p = esperarPopstate()
    await usuario.keyboard('{Enter}')
    await act(() => p)
    expect(campoDestino('Aula 121')).toBeInTheDocument()
  })

  it('Esc cierra la búsqueda del origen y el foco queda en ese campo del panel', async () => {
    const { usuario } = renderizarPantalla()
    await usuario.click(campoOrigen())
    const p = esperarPopstate()
    await usuario.keyboard('{Escape}')
    await act(() => p)
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(campoOrigen()).toHaveFocus())
  })

  it('anuncia la cantidad de resultados medio segundo después de tipear', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    await usuario.type(screen.getByRole('combobox'), '12')
    const estado = screen.getByRole('status')
    await waitFor(() => expect(estado).toHaveTextContent(/^\d+ resultados$/), { timeout: 1500 })
  })

  it('"zzz": dice que no encontró, sugiere cómo buscar y muestra las referencias', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    await usuario.type(screen.getByRole('combobox'), 'zzz')
    expect(screen.getByText('No encontramos «zzz»')).toBeInTheDocument()
    expect(screen.getByText(TEXTOS.sinResultadosSugerencia)).toBeInTheDocument()
    expect(screen.getByRole('group', { name: TEXTOS.referencias })).toBeInTheDocument()
    await waitFor(
      () => expect(screen.getByRole('status')).toHaveTextContent('No hay resultados para «zzz»'),
      {
        timeout: 1500,
      },
    )
  })

  it('"Sin acceso ahora" con texto e ícono, sin cambiar el orden', async () => {
    const estadoAcceso = (id: string): EstadoAcceso =>
      id === 'humanidades-121' ? 'sin-acceso' : 'accesible'
    const { usuario } = renderizarPantalla({ integraciones: { estadoAcceso }, hash: '#buscar' })
    await usuario.type(screen.getByRole('combobox'), '12')
    const opciones = screen.getAllByRole('option')
    expect(opciones[1]).toHaveTextContent('Aula 121')
    expect(opciones[1]).toHaveTextContent(TEXTOS.sinAcceso)
    expect(opciones[1]?.querySelector('.fila__estado svg')).toBeInTheDocument()
    expect(opciones[0]).not.toHaveTextContent(TEXTOS.sinAcceso)
    expect(opciones[1]?.getAttribute('aria-describedby')).toMatch(/-e$/)
  })

  it('con el almacenamiento bloqueado la búsqueda funciona sin errores', async () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => {
        throw new Error('bloqueado')
      },
      removeItem: () => {
        throw new Error('bloqueado')
      },
    } as unknown as Storage
    const error = vi.spyOn(console, 'error')
    const { usuario } = renderizarPantalla({ almacen: crearAlmacen(roto) })
    await elegirDestino(usuario, '121', 'Aula 121')
    expect(campoDestino('Aula 121')).toBeInTheDocument()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('el ejemplo de búsqueda solo aparece con el campo vacío', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    expect(screen.getByText(TEXTOS.ejemploBusqueda)).toBeInTheDocument()
    await usuario.type(screen.getByRole('combobox'), 'a')
    expect(screen.queryByText(TEXTOS.ejemploBusqueda)).toBeNull()
  })
})

describe('recientes', () => {
  it('el destino elegido aparece primero en los recientes de la próxima búsqueda de destino', async () => {
    const { usuario } = renderizarPantalla()
    await elegirDestino(usuario, 'teatro', 'Teatro')
    await usuario.click(campoDestino('Teatro'))
    const recientes = within(screen.getByRole('group', { name: TEXTOS.recientes }))
    expect(recientes.getAllByRole('option')[0]).toHaveTextContent('Teatro')
  })

  it('los orígenes tienen sus propios recientes', async () => {
    const { usuario } = renderizarPantalla()
    await elegirDestino(usuario, 'teatro', 'Teatro')
    await elegirOrigen(usuario, 'biblio', 'Biblioteca')
    await usuario.click(campoOrigen('Biblioteca'))
    const recientes = within(screen.getByRole('group', { name: TEXTOS.recientes }))
    expect(
      recientes.getAllByRole('option').map((o) => o.querySelector('.fila__nombre')?.textContent),
    ).toEqual(['Biblioteca'])
  })

  it('la cruz de un reciente lo quita sin elegirlo', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    await usuario.click(campoDestino())
    expect(screen.getByRole('group', { name: TEXTOS.recientes })).toBeInTheDocument()
    await usuario.click(screen.getByTitle(TEXTOS.quitarReciente('Aula 121')))
    expect(screen.queryByRole('group', { name: TEXTOS.recientes })).toBeNull()
    // Sigue en la búsqueda: la cruz no elige el lugar.
    expect(screen.getByRole('dialog', { name: TEXTOS.buscarLugar })).toBeInTheDocument()
  })

  it('con el teclado, Supr sobre un reciente activo lo quita', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    await usuario.click(campoDestino())
    const reciente = within(screen.getByRole('group', { name: TEXTOS.recientes })).getAllByRole(
      'option',
    )[0]!
    expect(reciente).toHaveAttribute('aria-keyshortcuts', 'Delete')
    await usuario.keyboard('{ArrowDown}{Delete}')
    expect(screen.queryByRole('group', { name: TEXTOS.recientes })).toBeNull()
    expect(screen.getByRole('dialog', { name: TEXTOS.buscarLugar })).toBeInTheDocument()
  })

  it('Supr sobre una opción que no es reciente no hace nada', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    const antes = screen.getAllByRole('option').length
    await usuario.keyboard('{ArrowDown}{Delete}')
    expect(screen.getAllByRole('option')).toHaveLength(antes)
  })

  it('el mismo nombre y edificio en resultado, campo de destino y recientes', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    const nombre = 'Lab. de Microscopía'
    const detalle = 'Derecho y Ciencia Política · Laboratorio'
    await usuario.type(screen.getByRole('combobox'), 'microscopia')
    const fila = screen.getAllByRole('option')[0]!
    expect(fila.querySelector('.fila__nombre')?.textContent).toBe(nombre)
    expect(fila.querySelector('.fila__detalle')?.textContent).toBe(detalle)
    const p = esperarPopstate()
    await usuario.click(fila)
    await act(() => p)
    expect(campoDestino(nombre)).toHaveTextContent(nombre)
    await usuario.click(campoDestino(nombre))
    const reciente = within(screen.getByRole('group', { name: TEXTOS.recientes })).getAllByRole(
      'option',
    )[0]!
    expect(reciente.querySelector('.fila__nombre')?.textContent).toBe(nombre)
    expect(reciente.querySelector('.fila__detalle')?.textContent).toBe(detalle)
  })
})

describe('panel "Cómo llegar"', () => {
  it('elegir el origen sin destino pasa, en la misma entrada, a buscar el destino', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.click(campoOrigen())
    expect(screen.getByRole('dialog', { name: TEXTOS.elegirPartida })).toBeInTheDocument()
    await usuario.type(screen.getByRole('combobox'), 'biblio')
    await usuario.click(screen.getByRole('option', { name: /^Biblioteca/ }))
    expect(screen.getByRole('dialog', { name: TEXTOS.buscarLugar })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAccessibleName(TEXTOS.destinoVacio)
    await usuario.type(screen.getByRole('combobox'), '121')
    const p = esperarPopstate()
    await usuario.click(screen.getByRole('option', { name: /^Aula 121/ }))
    await act(() => p)
    expect(campoOrigen('Biblioteca')).toBeInTheDocument()
    expect(campoDestino('Aula 121')).toBeInTheDocument()
    expect(lista.map((x) => [x.origen, x.destino])).toEqual([['biblioteca', 'humanidades-121']])
  })

  it('orden de la búsqueda de origen: entradas al campus y después referencias', async () => {
    const { usuario } = renderizarPantalla()
    await usuario.click(campoOrigen())
    const dialogo = screen.getByRole('dialog', { name: TEXTOS.elegirPartida })
    expect(within(dialogo).queryByRole('group', { name: TEXTOS.recientes })).toBeNull()
    const nombres = within(dialogo)
      .getAllByRole('option')
      .map((o) => o.querySelector('.fila__nombre')?.textContent)
    expect(nombres[0]).toBe('Entrada Florencio Varela')
    expect(nombres.indexOf('Biblioteca')).toBeGreaterThan(
      nombres.indexOf('Entrada Pte. Perón (sur)'),
    )
  })

  it('la cruz del origen lo borra y conserva el destino', async () => {
    const { usuario } = renderizarPantalla()
    await elegirDestino(usuario, 'biblio', 'Biblioteca')
    expect(screen.queryByRole('button', { name: TEXTOS.borrarOrigen })).toBeNull()
    await elegirOrigen(usuario, 'florencio', 'Entrada Florencio Varela')
    await usuario.click(screen.getByRole('button', { name: TEXTOS.borrarOrigen }))
    expect(campoOrigen()).toBeInTheDocument()
    expect(campoDestino('Biblioteca')).toBeInTheDocument()
  })

  it('elegir el origen en la búsqueda actualiza solo ese campo y pide la ruta', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await elegirDestino(usuario, '121', 'Aula 121')
    expect(solicitarRuta).not.toHaveBeenCalled()
    await elegirOrigen(usuario, 'biblio', 'Biblioteca')
    expect(campoOrigen('Biblioteca')).toBeInTheDocument()
    expect(campoDestino('Aula 121')).toBeInTheDocument()
    expect(lista.map((x) => [x.origen, x.destino])).toEqual([['biblioteca', 'humanidades-121']])
  })

  it('cerrar la búsqueda de destino sin elegir no cambia nada ni repite el pedido', async () => {
    const { solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await armarRuta(usuario)
    expect(solicitarRuta).toHaveBeenCalledTimes(1)
    await usuario.click(campoDestino('Teatro'))
    const p = esperarPopstate()
    await usuario.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: TEXTOS.volver }),
    )
    await act(() => p)
    expect(campoOrigen('Biblioteca')).toBeInTheDocument()
    expect(campoDestino('Teatro')).toBeInTheDocument()
    expect(solicitarRuta).toHaveBeenCalledTimes(1)
  })

  it('intercambiar con los dos datos pide la ruta en el sentido nuevo y lo anuncia', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await armarRuta(usuario)
    await usuario.click(screen.getByRole('button', { name: TEXTOS.intercambiar }))
    expect(campoOrigen('Teatro')).toBeInTheDocument()
    expect(campoDestino('Biblioteca')).toBeInTheDocument()
    expect(lista.map((x) => x.origen)).toEqual(['biblioteca', 'teatro'])
    await waitFor(() =>
      expect(screen.getByTestId('anunciador')).toHaveTextContent(
        TEXTOS.intercambiado('Teatro', 'Biblioteca'),
      ),
    )
  })

  it('intercambiar con el origen vacío deja el destino vacío y no pide nada', async () => {
    const { solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await elegirDestino(usuario, 'teatro', 'Teatro')
    await usuario.click(screen.getByRole('button', { name: TEXTOS.intercambiar }))
    expect(campoOrigen('Teatro')).toBeInTheDocument()
    expect(campoDestino()).toHaveTextContent('¿A dónde vas?')
    expect(solicitarRuta).not.toHaveBeenCalled()
  })

  it('sin destino no se pide la ruta aunque se elija el origen', async () => {
    const { solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.click(campoOrigen())
    await usuario.type(screen.getByRole('combobox'), 'biblio')
    await usuario.click(screen.getByRole('option', { name: /^Biblioteca/ }))
    // Ya pasó a buscar el destino: se cierra sin elegir.
    const p = esperarPopstate()
    await usuario.keyboard('{Escape}')
    await act(() => p)
    expect(campoOrigen('Biblioteca')).toBeInTheDocument()
    expect(campoDestino()).toHaveTextContent('¿A dónde vas?')
    expect(solicitarRuta).not.toHaveBeenCalled()
  })

  it('borrar el destino cancela el pedido y conserva el origen', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await armarRuta(usuario)
    expect(screen.getByTestId('contenido-ruta')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: TEXTOS.borrarDestino }))
    expect(lista[0]?.signal.aborted).toBe(true)
    expect(screen.queryByTestId('contenido-ruta')).toBeNull()
    expect(campoOrigen('Biblioteca')).toBeInTheDocument()
    expect(solicitarRuta).toHaveBeenCalledTimes(1)
  })

  it('"Cancelar" borra origen y destino, cancela el pedido y vuelve a encuadrar el campus', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await armarRuta(usuario)
    expect(screen.getByTestId('mapa-doble')).toHaveAttribute('data-encuadre', 'ruta')
    await usuario.click(screen.getByRole('button', { name: TEXTOS.cancelar }))
    expect(lista[0]?.signal.aborted).toBe(true)
    expect(campoOrigen()).toBeInTheDocument()
    expect(campoDestino()).toBeInTheDocument()
    expect(screen.queryByTestId('contenido-ruta')).toBeNull()
    expect(screen.queryByRole('button', { name: TEXTOS.cancelar })).toBeNull()
    expect(screen.getByTestId('mapa-doble')).toHaveAttribute('data-encuadre', 'campus')
  })

  it('con un solo punto el mapa se acerca a ese punto; con los dos, a la ruta', async () => {
    const { usuario } = renderizarPantalla()
    const mapa = screen.getByTestId('mapa-doble')
    expect(mapa).toHaveAttribute('data-encuadre', 'campus')
    await elegirDestino(usuario, 'teatro', 'Teatro')
    expect(mapa).toHaveAttribute('data-encuadre', 'lugar')
    expect(mapa.dataset.marcador).not.toBe('')
    await elegirOrigen(usuario, 'biblio', 'Biblioteca')
    expect(mapa).toHaveAttribute('data-encuadre', 'ruta')
  })

  it('origen igual al destino no pide ruta', async () => {
    const { solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await elegirDestino(usuario, 'biblio', 'Biblioteca')
    await elegirOrigen(usuario, 'biblio', 'Biblioteca')
    expect(solicitarRuta).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: TEXTOS.cancelar })).toBeNull()
  })

  it('el espacio ContenidoRuta aparece solo en la fase ruta (y se puede reemplazar)', async () => {
    function MiRuta({
      origen,
      destino,
    }: {
      origen: { nombre: string }
      destino: { nombre: string }
    }) {
      return (
        <p>
          Ruta de {origen.nombre} a {destino.nombre}
        </p>
      )
    }
    function Clima() {
      return <p>Llueve</p>
    }
    const { usuario } = renderizarPantalla({
      integraciones: { ContenidoRuta: MiRuta, AvisoClima: Clima },
    })
    await elegirDestino(usuario, 'teatro', 'Teatro')
    expect(screen.queryByText(/Ruta de/)).toBeNull()
    expect(screen.queryByText('Llueve')).toBeNull()
    await elegirOrigen(usuario, 'biblio', 'Biblioteca')
    expect(screen.getByText('Ruta de Biblioteca a Teatro')).toBeInTheDocument()
    // En celular el aviso del clima va debajo de la tarjeta de arriba.
    expect(screen.getByText('Llueve').closest('.avisos-arriba__clima')).not.toBeNull()
  })
})

describe('ayuda', () => {
  it('el botón (?) abre la ayuda con pasos, leyenda y aviso de ubicación; Atrás la cierra sin cambiar la selección', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    await armarRuta(usuario)
    await usuario.click(screen.getByRole('button', { name: TEXTOS.ayuda }))
    const ayuda = screen.getByRole('dialog', { name: TEXTOS.ayudaTitulo })
    for (const paso of TEXTOS.ayudaPasos) expect(within(ayuda).getByText(paso)).toBeInTheDocument()
    for (const s of [TEXTOS.leyendaOrigen, TEXTOS.leyendaDestino, TEXTOS.leyendaRuta]) {
      const item = within(ayuda).getByText(s).closest('li')!
      expect(item.querySelector('svg')).toBeInTheDocument()
    }
    expect(within(ayuda).getByText(TEXTOS.ayudaUbicacion)).toBeInTheDocument()
    expect(window.location.hash).toBe('#ayuda')
    const p = esperarPopstate()
    act(() => window.history.back())
    await act(() => p)
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(campoOrigen('Biblioteca')).toBeInTheDocument()
    expect(campoDestino('Teatro')).toBeInTheDocument()
  })
})

describe('PC: barra lateral', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      (consulta: string) =>
        ({
          matches: consulta === `(min-width: ${ANCHO_ESCRITORIO}px)`,
          media: consulta,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  function panel() {
    return screen.getByRole('region', { name: (_, el) => el.classList.contains('hoja') })
  }

  it('el panel es fijo: sin manija', () => {
    renderizarPantalla()
    expect(panel()).toHaveAttribute('data-altura', 'panel')
    expect(screen.queryByRole('button', { name: TEXTOS.manija })).toBeNull()
  })

  it('el campo que falta es un cuadro de texto y la barra lateral lista sus opciones', () => {
    renderizarPantalla()
    expect(screen.getByRole('textbox', { name: TEXTOS.campoOrigen(null) })).toBeInTheDocument()
    expect(within(panel()).getByRole('heading', { name: TEXTOS.elegiOrigen })).toBeInTheDocument()
    expect(
      within(panel()).getByRole('heading', { name: TEXTOS.entradasAlCampus }),
    ).toBeInTheDocument()
  })

  it('escribir filtra la lista y elegir pasa al destino; con los dos, pide la ruta', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.type(screen.getByRole('textbox', { name: TEXTOS.campoOrigen(null) }), 'biblio')
    await usuario.click(within(panel()).getByRole('button', { name: /^Biblioteca/ }))
    expect(campoOrigen('Biblioteca')).toBeInTheDocument()
    expect(within(panel()).getByRole('heading', { name: TEXTOS.elegiDestino })).toBeInTheDocument()
    await usuario.type(screen.getByRole('textbox', { name: TEXTOS.campoDestino(null) }), '121')
    await usuario.click(within(panel()).getByRole('button', { name: /^Aula 121/ }))
    expect(lista.map((x) => [x.origen, x.destino])).toEqual([['biblioteca', 'humanidades-121']])
    expect(within(panel()).getByRole('button', { name: TEXTOS.cancelar })).toBeInTheDocument()
  })

  it('sin resultados lo dice en la barra lateral', async () => {
    const { usuario } = renderizarPantalla()
    await usuario.type(screen.getByRole('textbox', { name: TEXTOS.campoOrigen(null) }), 'zzz')
    expect(within(panel()).getByText(TEXTOS.sinResultados('zzz'))).toBeInTheDocument()
  })

  it('los recientes aparecen en la barra lateral y la cruz los quita', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    // Con el destino como campo activo se ven sus recientes.
    await usuario.click(campoDestino())
    expect(within(panel()).getByRole('heading', { name: TEXTOS.recientes })).toBeInTheDocument()
    await usuario.click(
      within(panel()).getByRole('button', { name: TEXTOS.quitarReciente('Aula 121') }),
    )
    expect(within(panel()).queryByRole('heading', { name: TEXTOS.recientes })).toBeNull()
  })

  it('origen igual al destino: "Ya estás en…" y no se pide ruta', async () => {
    const { solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.click(within(panel()).getByRole('button', { name: /^Biblioteca/ }))
    await usuario.click(within(panel()).getByRole('button', { name: /^Biblioteca/ }))
    expect(screen.getByText(TEXTOS.yaEstas('Biblioteca'))).toBeInTheDocument()
    expect(solicitarRuta).not.toHaveBeenCalled()
  })
})
