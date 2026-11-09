import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CLAVE_ESCENARIO_CLIMA, crearControlEscenario } from '../../clima/index.ts'
import PanelPrueba from './PanelPrueba.tsx'
import { usePanelPrueba } from './usePanelPrueba.ts'
import { DURACION_PULSACION_LARGA_MS } from './usePulsacionLarga.ts'

/** Botón de ayuda de mentira con el gesto oculto, como lo va a conectar la App. */
function Escena({ busqueda = '', abrirAyuda }: { busqueda?: string; abrirAyuda: () => void }) {
  const control = crearControlEscenarioMemo()
  const panel = usePanelPrueba(busqueda)
  return (
    <>
      <button type="button" aria-label="Ayuda" onClick={abrirAyuda} {...panel.propsBotonAyuda}>
        ?
      </button>
      <PanelPrueba
        control={control}
        abierto={panel.abierto}
        onCerrar={panel.cerrar}
        fechaSimulada="05/11 10:00"
      />
    </>
  )
}

let controlCompartido: ReturnType<typeof crearControlEscenario> | null = null
function crearControlEscenarioMemo() {
  controlCompartido ??= crearControlEscenario({ busqueda: '' })
  return controlCompartido
}

beforeEach(() => {
  vi.useFakeTimers()
  sessionStorage.clear()
  controlCompartido = null
})
afterEach(() => {
  vi.useRealTimers()
})

function presionar(boton: HTMLElement, ms: number) {
  fireEvent.pointerDown(boton, { button: 0 })
  act(() => {
    vi.advanceTimersByTime(ms)
  })
  fireEvent.pointerUp(boton)
  fireEvent.click(boton)
}

describe('panel de prueba oculto', () => {
  it('un toque corto en ayuda abre la ayuda y no el panel', () => {
    const abrirAyuda = vi.fn()
    render(<Escena abrirAyuda={abrirAyuda} />)
    presionar(screen.getByRole('button', { name: 'Ayuda' }), 300)
    expect(abrirAyuda).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog', { name: 'Panel de prueba' })).not.toBeInTheDocument()
  })

  it('soltar justo antes de los 3 s no lo abre', () => {
    render(<Escena abrirAyuda={() => {}} />)
    presionar(screen.getByRole('button', { name: 'Ayuda' }), DURACION_PULSACION_LARGA_MS - 1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('mantener presionado 3 s lo abre con la opción activa marcada, sin abrir la ayuda', () => {
    const abrirAyuda = vi.fn()
    render(<Escena abrirAyuda={abrirAyuda} />)
    presionar(screen.getByRole('button', { name: 'Ayuda' }), DURACION_PULSACION_LARGA_MS)
    expect(screen.getByRole('dialog', { name: 'Panel de prueba' })).toBeInTheDocument()
    expect(abrirAyuda).not.toHaveBeenCalled()
    for (const nombre of ['Seco', 'Lluvia', 'Error', 'Lento']) {
      expect(screen.getByRole('radio', { name: nombre })).toBeInTheDocument()
    }
    expect(screen.getByRole('radio', { name: 'Seco' })).toBeChecked()
    expect(screen.getByText('05/11 10:00')).toBeInTheDocument()
  })

  it('elegir una opción la guarda en sessionStorage y la marca como activa', () => {
    render(<Escena busqueda="?panel=prueba" abrirAyuda={() => {}} />)
    fireEvent.click(screen.getByRole('radio', { name: 'Lluvia' }))
    expect(sessionStorage.getItem(CLAVE_ESCENARIO_CLIMA)).toBe('lluvia')
    expect(screen.getByRole('radio', { name: 'Lluvia' })).toBeChecked()
    expect(screen.getByText('Lluvia', { selector: 'strong' })).toBeInTheDocument()
    expect(controlCompartido?.actual()).toBe('lluvia')
  })

  it('`?panel=prueba` lo abre; se cierra con el botón, tocando afuera o con Escape', () => {
    render(<Escena busqueda="?panel=prueba" abrirAyuda={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    presionar(screen.getByRole('button', { name: 'Ayuda' }), DURACION_PULSACION_LARGA_MS)
    fireEvent.click(screen.getByRole('button', { name: 'Cerrar panel de prueba' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    presionar(screen.getByRole('button', { name: 'Ayuda' }), DURACION_PULSACION_LARGA_MS)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('sin fecha simulada no muestra esa línea', () => {
    const control = crearControlEscenario({ busqueda: '', almacen: null })
    render(<PanelPrueba control={control} abierto onCerrar={() => {}} />)
    expect(screen.queryByText(/Fecha simulada/)).not.toBeInTheDocument()
  })
})
