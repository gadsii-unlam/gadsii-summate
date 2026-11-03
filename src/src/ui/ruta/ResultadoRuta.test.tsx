import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EstadoOrquestador } from '../../clima/index.ts'
import ResultadoRuta, { type PropsResultadoRuta } from './ResultadoRuta.tsx'
import { CLIMA, planReal } from './test/datos.ts'
import { EVENTO_FINALIZAR_VIAJE } from './textos.ts'

const DIR = 'direccion-alumnos'
const SALUD = 'dpto-cs-salud'

function renderResultado(
  origenId: string,
  destinoId: string,
  clima: keyof typeof CLIMA,
  extra: Partial<PropsResultadoRuta> = {},
) {
  const { plan, origen, destino } = planReal(origenId, destinoId, CLIMA[clima])
  const usuario = userEvent.setup()
  const r = render(<ResultadoRuta origen={origen} destino={destino} estado={plan} {...extra} />)
  return { ...r, usuario, plan, origen, destino }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('tarjeta resumen', () => {
  it('la ruta de ejemplo muestra "2 min · 125 m" e "Incluye 55 m al aire libre"', () => {
    renderResultado(DIR, SALUD, 'seco')
    const tarjeta = screen.getByTestId('ruta-resumen')
    expect(tarjeta).toHaveTextContent('2 min · 125 m')
    expect(tarjeta).toHaveTextContent('Incluye 55 m al aire libre')
  })

  it('una ruta sin metros al aire libre muestra "Todo bajo techo"', () => {
    renderResultado('aula-121', 'aula-110', 'seco')
    expect(screen.getByTestId('ruta-resumen')).toHaveTextContent('Todo bajo techo')
  })

  it('anuncia el resumen en una región aria-live', () => {
    renderResultado(DIR, SALUD, 'seco')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ruta encontrada: 2 min, 125 m, incluye 55 m al aire libre',
    )
  })
})

describe('chips de alternativas', () => {
  it('con lluvia: "Más resguardada · 5 min" primero, recomendada y elegida; "Más rápida · 2 min" después', () => {
    renderResultado(DIR, SALUD, 'lluvia')
    const chips = within(screen.getByRole('list', { name: 'Opciones de ruta' })).getAllByRole(
      'button',
    )
    expect(chips).toHaveLength(2)
    expect(chips[0]).toHaveTextContent('Más resguardada · 5 min')
    expect(chips[0]).toHaveTextContent('Recomendada con lluvia')
    expect(chips[0]).toHaveAttribute('aria-pressed', 'true')
    expect(chips[1]).toHaveTextContent('Más rápida · 2 min')
    expect(chips[1]).not.toHaveTextContent('Recomendada')
    expect(chips[1]).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTestId('ruta-resumen')).toHaveTextContent('5 min · 330 m')
    expect(screen.getByTestId('ruta-resumen')).toHaveTextContent('Incluye 35 m al aire libre')
  })

  it('tocar "Más rápida" cambia la tarjeta al instante, sin "Buscando el camino…" y sin red', async () => {
    const red = vi.spyOn(globalThis, 'fetch')
    const alCambiarSeleccion = vi.fn()
    const { usuario } = renderResultado(DIR, SALUD, 'lluvia', { alCambiarSeleccion })
    expect(alCambiarSeleccion).toHaveBeenLastCalledWith(
      expect.objectContaining({ criterio: 'resguardada' }),
    )
    await usuario.click(screen.getByRole('button', { name: /Más rápida/ }))
    expect(screen.getByTestId('ruta-resumen')).toHaveTextContent('2 min · 125 m')
    expect(screen.getByTestId('ruta-resumen')).toHaveTextContent('Incluye 55 m al aire libre')
    expect(screen.getByRole('button', { name: /Más rápida/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByText('Buscando el camino…')).toBeNull()
    expect(red).not.toHaveBeenCalled()
    const ultima = alCambiarSeleccion.mock.lastCall![0]
    expect(ultima.criterio).toBe('mas-corta')
    expect(ultima.alternativa.criterio).toBe('resguardada')
    red.mockRestore()
  })

  it('con el clima caído y un criterio elegido, ningún chip dice "Recomendada con lluvia"', () => {
    const { plan, origen, destino } = planReal(DIR, SALUD, CLIMA.caido, 'resguardada')
    render(<ResultadoRuta origen={origen} destino={destino} estado={plan} />)
    expect(screen.getAllByRole('button', { pressed: true })).toHaveLength(1)
    expect(screen.queryByText('Recomendada con lluvia')).toBeNull()
  })

  it('una resguardada sin metros al aire libre se llama "Techada"', () => {
    // En el ejemplo real la resguardada pasa 35 m por la vereda: se fuerza una techada.
    const { plan, origen, destino } = planReal(DIR, SALUD, CLIMA.lluvia)
    const techada = { ...plan.principal!, exteriorM: 0, exteriorPx: 0 } as typeof plan.principal
    render(
      <ResultadoRuta origen={origen} destino={destino} estado={{ ...plan, principal: techada }} />,
    )
    expect(screen.getAllByRole('button', { pressed: true })[0]).toHaveTextContent('Techada · 5 min')
  })
})

describe('ruta única', () => {
  it('sin lluvia no hay chips', () => {
    renderResultado(DIR, SALUD, 'seco')
    expect(screen.queryByRole('list', { name: 'Opciones de ruta' })).toBeNull()
    expect(screen.queryByText(/Ya es techada|más resguardada/)).toBeNull()
  })

  it('con lluvia y Aula 121 → Aula 110: "Ya es techada"', () => {
    renderResultado('aula-121', 'aula-110', 'lluvia')
    expect(screen.queryByRole('list', { name: 'Opciones de ruta' })).toBeNull()
    expect(screen.getByText('Ya es techada')).toBeInTheDocument()
  })

  it('con lluvia y la resguardada igual a la más corta con metros afuera: "Es la opción más resguardada"', () => {
    const { plan } = renderResultado('entrada-campus-florencio-varela', 'aula-121', 'lluvia')
    expect(plan.rutaUnica).toBe(true)
    expect(screen.queryByRole('list', { name: 'Opciones de ruta' })).toBeNull()
    expect(screen.getByText('Es la opción más resguardada')).toBeInTheDocument()
  })
})

describe('"Buscando el camino…"', () => {
  const { plan, origen, destino } = planReal(DIR, SALUD, CLIMA.seco)
  const esperando: EstadoOrquestador = {
    tipo: 'esperando-clima',
    consulta: { origen: origen.puertas, destino: destino.puertas },
  }

  it('aparece a los 150 ms, con barra indeterminada, y queda al menos 400 ms', () => {
    vi.useFakeTimers()
    const props = { origen, destino }
    const { rerender } = render(<ResultadoRuta {...props} estado={esperando} />)
    act(() => vi.advanceTimersByTime(140))
    expect(screen.queryByText('Buscando el camino…')).toBeNull()
    act(() => vi.advanceTimersByTime(20))
    expect(screen.getByText('Buscando el camino…')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
    expect(screen.getByText('Dirección de Alumnos → Dpto. de Cs. de la Salud')).toBeInTheDocument()

    // La ruta llega a los 200 ms: el indicador sigue hasta cumplir 400 ms visible.
    act(() => vi.advanceTimersByTime(40))
    rerender(<ResultadoRuta {...props} estado={plan} />)
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByText('Buscando el camino…')).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(100))
    expect(screen.queryByText('Buscando el camino…')).toBeNull()
    expect(screen.getByTestId('ruta-resumen')).toHaveTextContent('2 min · 125 m')
  })

  it('si la ruta llega antes de 150 ms no aparece', () => {
    vi.useFakeTimers()
    const props = { origen, destino }
    const { rerender } = render(<ResultadoRuta {...props} estado={esperando} />)
    act(() => vi.advanceTimersByTime(100))
    rerender(<ResultadoRuta {...props} estado={plan} />)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByText('Buscando el camino…')).toBeNull()
    expect(screen.getByTestId('ruta-resumen')).toBeInTheDocument()
  })

  it('mientras se busca no hay ruta para el mapa', () => {
    const alCambiarSeleccion = vi.fn()
    render(
      <ResultadoRuta
        origen={origen}
        destino={destino}
        estado={esperando}
        alCambiarSeleccion={alCambiarSeleccion}
      />,
    )
    expect(alCambiarSeleccion).toHaveBeenLastCalledWith(null)
  })
})

describe('iniciar y finalizar', () => {
  it('primero "Iniciar" con las opciones de ruta; al iniciar, el resumen y "Finalizar viaje"', async () => {
    const alIniciar = vi.fn()
    const { usuario } = renderResultado(DIR, SALUD, 'lluvia', { alIniciar })
    expect(screen.queryByRole('button', { name: 'Indicaciones' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Finalizar viaje' })).toBeNull()
    expect(screen.getByRole('list', { name: 'Opciones de ruta' })).toBeInTheDocument()
    await usuario.click(screen.getByRole('button', { name: 'Iniciar' }))
    expect(alIniciar).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Iniciar' })).toBeNull()
    expect(screen.queryByRole('list', { name: 'Opciones de ruta' })).toBeNull()
    expect(screen.getByTestId('ruta-resumen')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finalizar viaje' })).toBeInTheDocument()
  })

  it('"Finalizar viaje" emite el evento para tolerar-senal-irregular y avisa', async () => {
    const alFinalizar = vi.fn()
    const evento = vi.fn()
    window.addEventListener(EVENTO_FINALIZAR_VIAJE, evento)
    const { usuario } = renderResultado(DIR, SALUD, 'seco', { alFinalizar })
    await usuario.click(screen.getByRole('button', { name: 'Iniciar' }))
    await usuario.click(screen.getByRole('button', { name: 'Finalizar viaje' }))
    expect(evento).toHaveBeenCalledTimes(1)
    expect(alFinalizar).toHaveBeenCalledTimes(1)
    window.removeEventListener(EVENTO_FINALIZAR_VIAJE, evento)
  })
})

describe('estados que muestra otro cambio', () => {
  it('con el clima caído y sin elegir criterio no muestra nada (la elección es de adaptar-ruta-al-clima)', () => {
    const { plan, origen, destino } = planReal(DIR, SALUD, CLIMA.caido)
    expect(plan.requiereEleccion).toBe(true)
    render(<ResultadoRuta origen={origen} destino={destino} estado={plan} />)
    expect(screen.queryByTestId('ruta-resumen')).toBeNull()
  })
})
