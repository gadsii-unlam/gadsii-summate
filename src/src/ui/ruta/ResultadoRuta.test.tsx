/**
 * `ResultadoRuta` ya no muestra tarjeta resumen, chips ni "Iniciar"/"Finalizar viaje": la ruta se
 * ve en el mapa, el resumen se anuncia por `aria-live` y el viaje empieza solo en cuanto hay ruta.
 */
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { EstadoOrquestador } from '../../clima/index.ts'
import ResultadoRuta, { type PropsResultadoRuta } from './ResultadoRuta.tsx'
import { CLIMA, planReal } from './test/datos.ts'
import { EVENTO_FINALIZAR_VIAJE } from './textos.ts'

const DIR = 'direccion-alumnos'
const SALUD = 'dpto-cs-salud'
// Con lluvia, Dirección de Alumnos → Dpto. de Cs. de la Salud ya da una sola ruta (la de entrar por
// la entrada más cercana es la más rápida); para tener dos opciones se usa Aula 208 → Aula 417.
const A208 = 'aula-208'
const A417 = 'aula-417'

function renderResultado(
  origenId: string,
  destinoId: string,
  clima: keyof typeof CLIMA,
  extra: Partial<PropsResultadoRuta> = {},
) {
  const { plan, origen, destino } = planReal(origenId, destinoId, CLIMA[clima])
  const r = render(<ResultadoRuta origen={origen} destino={destino} estado={plan} {...extra} />)
  return { ...r, plan, origen, destino }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('resumen anunciado', () => {
  it('anuncia el resumen en una región aria-live', () => {
    renderResultado(DIR, SALUD, 'seco')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ruta encontrada: 2 min, 125 m, incluye 55 m al aire libre',
    )
  })

  it('una ruta sin metros al aire libre se anuncia "todo bajo techo"', () => {
    renderResultado('aula-121', 'aula-110', 'seco')
    expect(screen.getByRole('status')).toHaveTextContent('todo bajo techo')
  })

  it('no muestra tarjeta resumen, chips ni botones de viaje', () => {
    renderResultado(DIR, SALUD, 'lluvia')
    expect(screen.queryByTestId('ruta-resumen')).toBeNull()
    expect(screen.queryByRole('list', { name: 'Opciones de ruta' })).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
  })
})

describe('ruta para el mapa', () => {
  it('con lluvia publica la resguardada y deja la más rápida como alternativa', () => {
    const alCambiarSeleccion = vi.fn()
    renderResultado(A208, A417, 'lluvia', { alCambiarSeleccion })
    const ultima = alCambiarSeleccion.mock.lastCall![0]
    expect(ultima.criterio).toBe('resguardada')
    expect(ultima.alternativa.criterio).toBe('mas-corta')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ruta encontrada: 7 min, 510 m, incluye 60 m al aire libre',
    )
  })

  it('elegir la otra desde afuera (la línea gris del mapa) cambia la ruta al instante y sin red', () => {
    const red = vi.spyOn(globalThis, 'fetch')
    const alCambiarSeleccion = vi.fn()
    const { plan, origen, destino } = planReal(A208, A417, CLIMA.lluvia)
    const props = { origen, destino, estado: plan, alCambiarSeleccion }
    const { rerender } = render(<ResultadoRuta {...props} />)
    rerender(<ResultadoRuta {...props} elegida="mas-corta" />)
    const ultima = alCambiarSeleccion.mock.lastCall![0]
    expect(ultima.criterio).toBe('mas-corta')
    expect(ultima.alternativa.criterio).toBe('resguardada')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Ruta encontrada: 4 min, 265 m, incluye 195 m al aire libre',
    )
    expect(screen.queryByText('Buscando el camino…')).toBeNull()
    expect(red).not.toHaveBeenCalled()
    red.mockRestore()
  })

  it('sin lluvia no hay alternativa', () => {
    const alCambiarSeleccion = vi.fn()
    renderResultado(DIR, SALUD, 'seco', { alCambiarSeleccion })
    expect(alCambiarSeleccion.mock.lastCall![0].alternativa).toBeNull()
  })

  it('con lluvia y una sola ruta posible (Aula 121 → Aula 110) no hay alternativa', () => {
    const alCambiarSeleccion = vi.fn()
    renderResultado('aula-121', 'aula-110', 'lluvia', { alCambiarSeleccion })
    expect(alCambiarSeleccion.mock.lastCall![0].alternativa).toBeNull()
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
    expect(screen.getByTestId('ruta-resultado')).toBeInTheDocument()
  })

  it('si la ruta llega antes de 150 ms no aparece', () => {
    vi.useFakeTimers()
    const props = { origen, destino }
    const { rerender } = render(<ResultadoRuta {...props} estado={esperando} />)
    act(() => vi.advanceTimersByTime(100))
    rerender(<ResultadoRuta {...props} estado={plan} />)
    act(() => vi.advanceTimersByTime(1000))
    expect(screen.queryByText('Buscando el camino…')).toBeNull()
    expect(screen.getByTestId('ruta-resultado')).toBeInTheDocument()
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

describe('el viaje empieza y termina solo', () => {
  it('no llama a alIniciar (el mapa muestra la ruta completa, no la partida)', () => {
    const alIniciar = vi.fn()
    renderResultado(DIR, SALUD, 'seco', { alIniciar })
    expect(alIniciar).not.toHaveBeenCalled()
  })

  it('al desmontarse (Cancelar) emite el evento para tolerar-senal-irregular y avisa', () => {
    const alFinalizar = vi.fn()
    const evento = vi.fn()
    window.addEventListener(EVENTO_FINALIZAR_VIAJE, evento)
    const { unmount } = renderResultado(DIR, SALUD, 'seco', { alFinalizar })
    expect(alFinalizar).not.toHaveBeenCalled()
    unmount()
    expect(evento).toHaveBeenCalledTimes(1)
    expect(alFinalizar).toHaveBeenCalledTimes(1)
    window.removeEventListener(EVENTO_FINALIZAR_VIAJE, evento)
  })

  it('sin ruta lista no hay viaje que finalizar', () => {
    const alFinalizar = vi.fn()
    const { plan, origen, destino } = planReal(A208, A417, CLIMA.caido)
    const { unmount } = render(
      <ResultadoRuta origen={origen} destino={destino} estado={plan} alFinalizar={alFinalizar} />,
    )
    unmount()
    expect(alFinalizar).not.toHaveBeenCalled()
  })
})

describe('estados que muestra otro cambio', () => {
  it('con el clima caído y sin elegir criterio no muestra nada (la elección es de adaptar-ruta-al-clima)', () => {
    const { plan, origen, destino } = planReal(A208, A417, CLIMA.caido)
    expect(plan.requiereEleccion).toBe(true)
    render(<ResultadoRuta origen={origen} destino={destino} estado={plan} />)
    expect(screen.queryByTestId('ruta-resultado')).toBeNull()
    expect(screen.getByTestId('ruta-resultado-vacio')).toBeInTheDocument()
  })

  it('con el clima caído y un criterio elegido, publica ese criterio', () => {
    const alCambiarSeleccion = vi.fn()
    const { plan, origen, destino } = planReal(A208, A417, CLIMA.caido, 'resguardada')
    render(
      <ResultadoRuta
        origen={origen}
        destino={destino}
        estado={plan}
        alCambiarSeleccion={alCambiarSeleccion}
      />,
    )
    expect(alCambiarSeleccion.mock.lastCall![0].criterio).toBe('resguardada')
  })
})
