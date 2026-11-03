import { act, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVES, crearAlmacen, crearAlmacenEnMemoria } from './estado/almacen.ts'
import type { EstadoAcceso, PedidoRuta } from './integraciones.ts'
import { TEXTOS } from './textos.ts'
import { esperarPopstate, renderizarPantalla } from './test/renderizar.tsx'

function pedidos() {
  const lista: PedidoRuta[] = []
  const solicitarRuta = vi.fn((p: PedidoRuta) => {
    lista.push(p)
  })
  return { lista, solicitarRuta }
}

/** Almacén con un reciente, para no ver la indicación de primer uso. */
function almacenConReciente(id = 'humanidades-121') {
  const a = crearAlmacenEnMemoria()
  a.escribir(CLAVES.recientes, [{ id, cuando: 1 }])
  return a
}

function hoja() {
  return screen.getByRole('region', { name: (_, el) => el.classList.contains('hoja') })
}

/** Busca un lugar desde el inicio y abre su ficha (la búsqueda del chip "Entradas" busca en todo). */
async function abrirFicha(
  usuario: ReturnType<typeof renderizarPantalla>['usuario'],
  texto: string,
  nombre: string,
) {
  await usuario.click(screen.getByRole('button', { name: TEXTOS.chipEntradas }))
  await usuario.type(screen.getByRole('combobox'), texto)
  await usuario.click(screen.getByRole('option', { name: new RegExp(`^${nombre}`) }))
}

/** "Cómo llegar" sin origen ni destino: la barra abre la búsqueda del origen y `Esc` la cierra. */
async function abrirPanelVacio(usuario: ReturnType<typeof renderizarPantalla>['usuario']) {
  await usuario.click(screen.getByRole('button', { name: TEXTOS.barraNombre }))
  const p = esperarPopstate()
  await usuario.keyboard('{Escape}')
  await act(() => p)
}

beforeEach(() => {
  window.history.replaceState(null, '', '/')
})

describe('inicio', () => {
  it('muestra la barra "¿Desde dónde salís?", los chips y el mapa', () => {
    renderizarPantalla({ almacen: almacenConReciente() })
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXTOS.barraNombre })).toHaveTextContent(
      '¿Desde dónde salís?',
    )
    expect(screen.getByRole('region', { name: TEXTOS.mapa })).toBeInTheDocument()
    const chips = within(screen.getByRole('list', { name: TEXTOS.chipsNombre }))
    expect(chips.getAllByRole('button').map((b) => b.textContent)).toEqual([
      'Biblioteca',
      'Buffet',
      'Salón de las Américas',
      'Teatro',
      'Gimnasio',
      'Rectorado',
      'Entradas',
    ])
  })

  it('el doble del mapa se usa sin cargar Leaflet', () => {
    renderizarPantalla()
    expect(screen.getByTestId('mapa-doble')).toBeInTheDocument()
    expect((window as unknown as { L?: unknown }).L).toBeUndefined()
  })

  it('cada chip abre la ficha correcta', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    for (const nombre of ['Biblioteca', 'Teatro', 'Buffet']) {
      await usuario.click(screen.getByRole('button', { name: nombre }))
      expect(screen.getByRole('heading', { level: 2, name: nombre })).toBeInTheDocument()
      const p = esperarPopstate()
      await usuario.click(screen.getByRole('button', { name: TEXTOS.volver }))
      await act(() => p)
    }
  })

  it('el chip "Entradas" lista las cuatro entradas al campus', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    await usuario.click(screen.getByRole('button', { name: 'Entradas' }))
    const grupo = screen.getByRole('group', { name: TEXTOS.entradasAlCampus })
    expect(
      within(grupo)
        .getAllByRole('option')
        .map((o) => o.querySelector('.fila__nombre')?.textContent),
    ).toEqual([
      'Entrada Florencio Varela',
      'Entrada La Paz',
      'Entrada Pte. Perón (norte)',
      'Entrada Pte. Perón (sur)',
    ])
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

  it('las flechas mueven aria-activedescendant y Enter elige', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    const campo = screen.getByRole('combobox')
    await usuario.type(campo, '12')
    await usuario.keyboard('{ArrowDown}{ArrowDown}')
    const activa = document.getElementById(campo.getAttribute('aria-activedescendant') ?? '')
    expect(activa).toHaveAttribute('aria-selected', 'true')
    expect(activa).toHaveTextContent('Aula 121')
    await usuario.keyboard('{Enter}')
    expect(screen.getByRole('heading', { level: 2, name: 'Aula 121' })).toBeInTheDocument()
  })

  it('Esc cierra la búsqueda del origen y el foco queda en ese campo del panel', async () => {
    const { usuario } = renderizarPantalla()
    await usuario.click(screen.getByRole('button', { name: TEXTOS.barraNombre }))
    const p = esperarPopstate()
    await usuario.keyboard('{Escape}')
    await act(() => p)
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() =>
      expect(screen.getByRole('button', { name: TEXTOS.campoOrigen(null) })).toHaveFocus(),
    )
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
    await abrirFicha(usuario, '121', 'Aula 121')
    expect(screen.getByRole('heading', { level: 2, name: 'Aula 121' })).toBeInTheDocument()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})

describe('ficha y recientes', () => {
  it('elegir un resultado abre la ficha con el foco en el nombre', async () => {
    const { usuario } = renderizarPantalla()
    await abrirFicha(usuario, '121', 'Aula 121')
    const titulo = screen.getByRole('heading', { level: 2, name: 'Aula 121' })
    expect(titulo).toHaveFocus()
    expect(hoja()).toHaveAccessibleName('Aula 121')
    expect(screen.getByText('Humanidades · Aula · Planta baja')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Cómo llegar/ })).toBeInTheDocument()
    expect(screen.getByText(TEXTOS.puertas(1))).toBeInTheDocument()
    expect(screen.getByTestId('mapa-doble')).toHaveAttribute('data-encuadre', 'lugar')
    expect(screen.getByTestId('mapa-doble').dataset.marcador).not.toBe('')
  })

  it('una ficha sin acceso muestra el estado, su explicación y mantiene "Cómo llegar"', async () => {
    const { usuario } = renderizarPantalla({
      integraciones: { estadoAcceso: () => 'sin-acceso' },
    })
    await usuario.click(screen.getByRole('button', { name: 'Biblioteca' }))
    const ficha = hoja()
    expect(within(ficha).getByText(TEXTOS.sinAcceso)).toBeInTheDocument()
    expect(within(ficha).queryByText(TEXTOS.sinAccesoExplicacion)).toBeNull()
    await usuario.click(within(ficha).getByRole('button', { name: TEXTOS.sinAccesoInfo }))
    expect(within(ficha).getByText(TEXTOS.sinAccesoExplicacion)).toBeInTheDocument()
    expect(within(ficha).getByRole('button', { name: /Cómo llegar/ })).toBeEnabled()
  })

  it('abrir la ficha guarda un reciente y aparece primero al volver al inicio', async () => {
    const { usuario } = renderizarPantalla()
    await usuario.click(screen.getByRole('button', { name: 'Teatro' }))
    const p = esperarPopstate()
    await usuario.click(screen.getByRole('button', { name: TEXTOS.cerrar }))
    await act(() => p)
    expect(within(hoja()).getByRole('heading', { name: TEXTOS.recientes })).toBeInTheDocument()
    expect(within(hoja()).getAllByRole('button', { name: /Teatro/ })[0]).toBeInTheDocument()
    expect(screen.getByTestId('mapa-doble').dataset.marcador).toBe('')
  })

  it('el mismo nombre y edificio en resultado, ficha, tarjeta, recientes y campo de destino', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    const nombre = 'Lab. de Microscopía'
    const detalle = 'Derecho y Ciencia Política · Laboratorio'
    await usuario.type(screen.getByRole('combobox'), 'microscopia')
    const fila = screen.getAllByRole('option')[0]!
    expect(fila.querySelector('.fila__nombre')?.textContent).toBe(nombre)
    expect(fila.querySelector('.fila__detalle')?.textContent).toBe(detalle)
    await usuario.click(fila)
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe(nombre)
    expect(document.querySelector('.tarjeta-titulo__nombre')?.textContent).toBe(nombre)
    expect(document.querySelector('.ficha__detalle')?.textContent).toBe(`${detalle} · Planta baja`)
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    expect(screen.getByRole('button', { name: TEXTOS.campoDestino(nombre) })).toHaveTextContent(
      nombre,
    )
    await usuario.click(screen.getByRole('button', { name: TEXTOS.campoDestino(nombre) }))
    const reciente = within(screen.getByRole('group', { name: TEXTOS.recientes })).getAllByRole(
      'option',
    )[0]!
    expect(reciente.querySelector('.fila__nombre')?.textContent).toBe(nombre)
    expect(reciente.querySelector('.fila__detalle')?.textContent).toBe(detalle)
  })
})

describe('panel "Cómo llegar"', () => {
  it('desde la ficha se abre con el destino; desde la barra, vacío', async () => {
    const { usuario } = renderizarPantalla()
    await abrirPanelVacio(usuario)
    expect(screen.getByRole('button', { name: TEXTOS.campoOrigen(null) })).toHaveTextContent(
      TEXTOS.origenVacio,
    )
    expect(screen.getByRole('button', { name: TEXTOS.campoDestino(null) })).toHaveTextContent(
      TEXTOS.destinoVacio,
    )
    const p = esperarPopstate()
    await usuario.click(screen.getByRole('button', { name: TEXTOS.volver }))
    await act(() => p)
    await abrirFicha(usuario, '121', 'Aula 121')
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    expect(
      screen.getByRole('button', { name: TEXTOS.campoDestino('Aula 121') }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXTOS.campoOrigen(null) })).toBeInTheDocument()
  })

  it('la barra pide primero el origen y después, sola, el destino', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.click(screen.getByRole('button', { name: TEXTOS.barraNombre }))
    expect(screen.getByRole('dialog', { name: TEXTOS.elegirPartida })).toBeInTheDocument()
    await usuario.type(screen.getByRole('combobox'), 'biblio')
    await usuario.click(screen.getByRole('option', { name: /^Biblioteca/ }))
    // La misma entrada del historial pasa a buscar el destino.
    expect(screen.getByRole('dialog', { name: TEXTOS.buscarLugar })).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toHaveAccessibleName(TEXTOS.destinoVacio)
    await usuario.type(screen.getByRole('combobox'), '121')
    const p = esperarPopstate()
    await usuario.click(screen.getByRole('option', { name: /^Aula 121/ }))
    await act(() => p)
    expect(
      screen.getByRole('button', { name: TEXTOS.campoOrigen('Biblioteca') }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TEXTOS.campoDestino('Aula 121') }),
    ).toBeInTheDocument()
    expect(lista.map((x) => [x.origen, x.destino])).toEqual([['biblioteca', 'humanidades-121']])
    // Atrás desde el panel vuelve al inicio.
    const q = esperarPopstate()
    await usuario.click(screen.getByRole('button', { name: TEXTOS.volver }))
    await act(() => q)
    expect(screen.getByRole('button', { name: TEXTOS.barraNombre })).toBeInTheDocument()
  })

  it('elegir el origen en la hoja abre la búsqueda del destino si falta', async () => {
    const { usuario } = renderizarPantalla()
    await abrirPanelVacio(usuario)
    await usuario.click(within(hoja()).getByRole('button', { name: /Entrada Florencio Varela/ }))
    expect(screen.getByRole('dialog', { name: TEXTOS.buscarLugar })).toBeInTheDocument()
  })

  it('la cruz del origen lo borra y conserva el destino', async () => {
    const { usuario } = renderizarPantalla()
    await usuario.click(screen.getByRole('button', { name: 'Biblioteca' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    expect(screen.queryByRole('button', { name: TEXTOS.borrarOrigen })).toBeNull()
    await usuario.click(within(hoja()).getByRole('button', { name: /Entrada Florencio Varela/ }))
    await usuario.click(screen.getByRole('button', { name: TEXTOS.borrarOrigen }))
    expect(screen.getByRole('button', { name: TEXTOS.campoOrigen(null) })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TEXTOS.campoDestino('Biblioteca') }),
    ).toBeInTheDocument()
  })

  it('el origen vacío explica que no se usa la ubicación; con origen, no', async () => {
    const { usuario } = renderizarPantalla()
    await usuario.click(screen.getByRole('button', { name: 'Biblioteca' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    expect(screen.getByText(TEXTOS.origenAyuda)).toBeInTheDocument()
    await usuario.click(within(hoja()).getByRole('button', { name: /Entrada Florencio Varela/ }))
    expect(screen.queryByText(TEXTOS.origenAyuda)).toBeNull()
  })

  it('la sugerencia no pide la ruta hasta confirmarla, y al confirmar la pide una vez', async () => {
    const almacen = almacenConReciente()
    almacen.escribir(CLAVES.ultimoOrigen, 'entrada-campus-florencio-varela')
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ almacen, integraciones: { solicitarRuta } })
    await usuario.click(screen.getByRole('button', { name: 'Biblioteca' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    expect(screen.getByRole('button', { name: TEXTOS.campoOrigen(null) })).toHaveTextContent(
      TEXTOS.origenVacio,
    )
    expect(screen.getByText('¿Salís de Entrada Florencio Varela?')).toBeInTheDocument()
    expect(solicitarRuta).not.toHaveBeenCalled()
    await usuario.click(screen.getByRole('button', { name: TEXTOS.usarOrigen }))
    expect(solicitarRuta).toHaveBeenCalledTimes(1)
    expect(lista[0]).toMatchObject({
      origen: 'entrada-campus-florencio-varela',
      destino: 'biblioteca',
    })
    expect(
      screen.getByRole('button', { name: TEXTOS.campoOrigen('Entrada Florencio Varela') }),
    ).toBeInTheDocument()
  })

  it('sin origen guardado no hay sugerencia', async () => {
    const { usuario } = renderizarPantalla()
    await abrirPanelVacio(usuario)
    expect(screen.queryByRole('button', { name: TEXTOS.usarOrigen })).toBeNull()
  })

  it('orden de la búsqueda de origen y de la hoja: sugerencia, entradas, referencias', async () => {
    const almacen = almacenConReciente()
    almacen.escribir(CLAVES.ultimoOrigen, 'teatro')
    const { usuario } = renderizarPantalla({ almacen })
    await abrirPanelVacio(usuario)
    const enHoja = within(hoja())
      .getAllByRole('button')
      .map((b) => b.textContent ?? '')
    const iSug = enHoja.indexOf(TEXTOS.usarOrigen)
    const iEntrada = enHoja.findIndex((t) => t.startsWith('Entrada Florencio Varela'))
    const iBiblio = enHoja.findIndex((t) => t.startsWith('Biblioteca'))
    expect(iSug).toBeGreaterThanOrEqual(0)
    expect(iSug).toBeLessThan(iEntrada)
    expect(iEntrada).toBeLessThan(iBiblio)

    await usuario.click(screen.getByRole('button', { name: TEXTOS.campoOrigen(null) }))
    expect(screen.getByRole('heading', { name: TEXTOS.tituloOrigen })).toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: TEXTOS.elegirPartida })).toBeInTheDocument()
    const nombres = screen
      .getAllByRole('option')
      .map((o) => o.querySelector('.fila__nombre')?.textContent)
    expect(nombres[0]).toBe('¿Salís de Teatro?')
    expect(nombres[1]).toBe('Entrada Florencio Varela')
    expect(nombres.indexOf('Biblioteca')).toBeGreaterThan(
      nombres.indexOf('Entrada Pte. Perón (sur)'),
    )
  })

  it('elegir el origen en la búsqueda actualiza solo ese campo y pide la ruta', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await abrirFicha(usuario, '121', 'Aula 121')
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    await usuario.click(screen.getByRole('button', { name: TEXTOS.campoOrigen(null) }))
    await usuario.type(screen.getByRole('combobox'), 'biblio')
    const p = esperarPopstate()
    await usuario.click(screen.getByRole('option', { name: /^Biblioteca/ }))
    await act(() => p)
    expect(
      screen.getByRole('button', { name: TEXTOS.campoOrigen('Biblioteca') }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TEXTOS.campoDestino('Aula 121') }),
    ).toBeInTheDocument()
    expect(lista.map((x) => [x.origen, x.destino])).toEqual([['biblioteca', 'humanidades-121']])
  })

  it('cerrar la búsqueda de destino sin elegir no cambia nada ni repite el pedido', async () => {
    const { solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.click(screen.getByRole('button', { name: 'Teatro' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    await usuario.click(within(hoja()).getByRole('button', { name: /Biblioteca/ }))
    expect(solicitarRuta).toHaveBeenCalledTimes(1)
    await usuario.click(screen.getByRole('button', { name: TEXTOS.campoDestino('Teatro') }))
    const p = esperarPopstate()
    await usuario.click(
      within(screen.getByRole('dialog')).getByRole('button', { name: TEXTOS.volver }),
    )
    await act(() => p)
    expect(
      screen.getByRole('button', { name: TEXTOS.campoOrigen('Biblioteca') }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXTOS.campoDestino('Teatro') })).toBeInTheDocument()
    expect(solicitarRuta).toHaveBeenCalledTimes(1)
  })

  it('intercambiar con los dos datos pide la ruta en el sentido nuevo y lo anuncia', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.click(screen.getByRole('button', { name: 'Teatro' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    await usuario.click(within(hoja()).getByRole('button', { name: /Biblioteca/ }))
    await usuario.click(screen.getByRole('button', { name: TEXTOS.intercambiar }))
    expect(screen.getByRole('button', { name: TEXTOS.campoOrigen('Teatro') })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: TEXTOS.campoDestino('Biblioteca') }),
    ).toBeInTheDocument()
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
    await usuario.click(screen.getByRole('button', { name: 'Teatro' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    await usuario.click(screen.getByRole('button', { name: TEXTOS.intercambiar }))
    expect(screen.getByRole('button', { name: TEXTOS.campoOrigen('Teatro') })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXTOS.campoDestino(null) })).toHaveTextContent(
      '¿A dónde vas?',
    )
    expect(solicitarRuta).not.toHaveBeenCalled()
  })

  it('sin destino no se pide la ruta aunque se elija el origen', async () => {
    const { solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await abrirPanelVacio(usuario)
    await usuario.click(within(hoja()).getByRole('button', { name: /Biblioteca/ }))
    expect(screen.getByRole('button', { name: TEXTOS.campoDestino(null) })).toHaveTextContent(
      '¿A dónde vas?',
    )
    expect(solicitarRuta).not.toHaveBeenCalled()
  })

  it('borrar el destino cancela el pedido y conserva el origen', async () => {
    const { lista, solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.click(screen.getByRole('button', { name: 'Teatro' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    await usuario.click(within(hoja()).getByRole('button', { name: /Biblioteca/ }))
    expect(screen.getByTestId('contenido-ruta')).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: TEXTOS.borrarDestino }))
    expect(lista[0]?.signal.aborted).toBe(true)
    expect(screen.queryByTestId('contenido-ruta')).toBeNull()
    expect(
      screen.getByRole('button', { name: TEXTOS.campoOrigen('Biblioteca') }),
    ).toBeInTheDocument()
    expect(solicitarRuta).toHaveBeenCalledTimes(1)
  })

  it('origen igual al destino: "Ya estás en…" y no se pide ruta', async () => {
    const { solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.click(screen.getByRole('button', { name: 'Biblioteca' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    await usuario.click(within(hoja()).getByRole('button', { name: /Biblioteca/ }))
    expect(screen.getByText(TEXTOS.yaEstas('Biblioteca'))).toBeInTheDocument()
    expect(solicitarRuta).not.toHaveBeenCalled()
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
    await usuario.click(screen.getByRole('button', { name: 'Teatro' }))
    expect(screen.queryByText(/Ruta de/)).toBeNull()
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    expect(screen.queryByText(/Ruta de/)).toBeNull()
    expect(screen.queryByText('Llueve')).toBeNull()
    await usuario.click(within(hoja()).getByRole('button', { name: /Biblioteca/ }))
    expect(screen.getByText('Ruta de Biblioteca a Teatro')).toBeInTheDocument()
    expect(screen.getByText('Llueve')).toBeInTheDocument()
  })

  it('Atrás desde la ruta vuelve a la ficha sin pedir otra ruta', async () => {
    const { solicitarRuta } = pedidos()
    const { usuario } = renderizarPantalla({ integraciones: { solicitarRuta } })
    await usuario.click(screen.getByRole('button', { name: 'Teatro' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    await usuario.click(within(hoja()).getByRole('button', { name: /Biblioteca/ }))
    expect(solicitarRuta).toHaveBeenCalledTimes(1)
    const p = esperarPopstate()
    act(() => window.history.back())
    await act(() => p)
    expect(screen.getByRole('heading', { level: 2, name: 'Teatro' })).toBeInTheDocument()
    expect(solicitarRuta).toHaveBeenCalledTimes(1)
  })
})

describe('hoja inferior', () => {
  it('la manija cambia la altura con el teclado y lo anuncia', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    const manija = screen.getByRole('button', { name: TEXTOS.manija })
    expect(manija).toHaveAccessibleDescription(TEXTOS.altura.colapsada)
    manija.focus()
    await usuario.keyboard('{Enter}')
    expect(manija).toHaveAccessibleDescription(TEXTOS.altura.media)
    await usuario.keyboard('{ArrowUp}')
    expect(manija).toHaveAccessibleDescription(TEXTOS.altura.expandida)
    await usuario.keyboard('{ArrowDown}{ArrowDown}')
    expect(manija).toHaveAccessibleDescription(TEXTOS.altura.colapsada)
    await waitFor(() =>
      expect(screen.getByTestId('anunciador')).toHaveTextContent(TEXTOS.altura.colapsada),
    )
  })

  it('en la altura colapsada el contenido oculto es inert y el foco no entra', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    const cuerpo = document.querySelector('.hoja__cuerpo')!
    expect(cuerpo).toHaveAttribute('inert')
    const manija = screen.getByRole('button', { name: TEXTOS.manija })
    manija.focus()
    await usuario.keyboard('{Enter}')
    expect(cuerpo).not.toHaveAttribute('inert')
  })

  it('publica el alto visible para el encuadre del mapa al anclar en otra altura', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    const mapa = screen.getByTestId('mapa-doble')
    const antes = Number(mapa.dataset.margenAbajo)
    expect(antes).toBeGreaterThan(0)
    screen.getByRole('button', { name: TEXTOS.manija }).focus()
    await usuario.keyboard('{Enter}')
    expect(Number(mapa.dataset.margenAbajo)).toBeGreaterThan(antes)
  })
})

describe('ayuda contextual', () => {
  it('primer uso: aparece sin recientes, en altura media y la barra sigue usable', () => {
    renderizarPantalla()
    expect(screen.getByText(TEXTOS.primerUso)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXTOS.entendido })).toBeInTheDocument()
    expect(hoja()).toHaveAttribute('data-altura', 'media')
    expect(screen.getByRole('button', { name: TEXTOS.barraNombre })).toBeEnabled()
  })

  it('primer uso: no aparece con recientes', () => {
    renderizarPantalla({ almacen: almacenConReciente() })
    expect(screen.queryByText(TEXTOS.primerUso)).toBeNull()
    expect(within(hoja()).getByRole('heading', { name: TEXTOS.recientes })).toBeInTheDocument()
  })

  it('primer uso: después de "Entendido" no vuelve', async () => {
    const almacen = crearAlmacenEnMemoria()
    const { usuario, unmount } = renderizarPantalla({ almacen })
    await usuario.click(screen.getByRole('button', { name: TEXTOS.entendido }))
    expect(screen.queryByText(TEXTOS.primerUso)).toBeNull()
    unmount()
    renderizarPantalla({ almacen })
    expect(screen.queryByText(TEXTOS.primerUso)).toBeNull()
  })

  it('el ejemplo de búsqueda solo aparece con el campo vacío', async () => {
    const { usuario } = renderizarPantalla({ hash: '#buscar' })
    expect(screen.getByText(TEXTOS.ejemploBusqueda)).toBeInTheDocument()
    await usuario.type(screen.getByRole('combobox'), 'a')
    expect(screen.queryByText(TEXTOS.ejemploBusqueda)).toBeNull()
  })

  it('la explicación de "Sin acceso ahora" solo aparece al tocar (i) y si no hay acceso', async () => {
    const { usuario } = renderizarPantalla()
    await usuario.click(screen.getByRole('button', { name: 'Biblioteca' }))
    expect(screen.queryByRole('button', { name: TEXTOS.sinAccesoInfo })).toBeNull()
    expect(screen.queryByText(TEXTOS.sinAccesoExplicacion)).toBeNull()
  })

  it('el botón (?) abre la ayuda con pasos, leyenda y aviso de ubicación; Atrás la cierra sin cambiar la selección', async () => {
    const { usuario } = renderizarPantalla({ almacen: almacenConReciente() })
    await usuario.click(screen.getByRole('button', { name: 'Teatro' }))
    await usuario.click(screen.getByRole('button', { name: /Cómo llegar/ }))
    await usuario.click(within(hoja()).getByRole('button', { name: /Biblioteca/ }))
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
    expect(
      screen.getByRole('button', { name: TEXTOS.campoOrigen('Biblioteca') }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: TEXTOS.campoDestino('Teatro') })).toBeInTheDocument()
  })
})
