import { act, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  crearControladorCierres,
  crearReloj,
  leerFechaSimulada,
  type ControladorCierres,
} from '../../cierres/index.ts'
import { LUGARES, cierresEjemplo, grafoReal, lugar } from '../../cierres/test/datos.ts'
import EtiquetaFechaSimulada from './EtiquetaFechaSimulada.tsx'
import { useEstadoCierres } from './useEstadoCierres.ts'

const ZONA = 'America/Argentina/Buenos_Aires'

function almacen() {
  const datos = new Map<string, string>()
  return {
    getItem: (k: string) => datos.get(k) ?? null,
    setItem: (k: string, v: string) => void datos.set(k, v),
    removeItem: (k: string) => void datos.delete(k),
  }
}

/** Pantalla mínima: la etiqueta y lo que el controlador considera vigente. */
function Prueba({ fecha, controlador }: { fecha: number | null; controlador: ControladorCierres }) {
  const estado = useEstadoCierres(controlador)
  return (
    <>
      <EtiquetaFechaSimulada fecha={fecha} zonaHoraria={ZONA} />
      <ul aria-label="Cierres vigentes">
        {estado?.vigentes.map((c) => (
          <li key={c.id}>{c.id}</li>
        ))}
      </ul>
      <p>
        {estado?.sinAcceso.has('lab-quimica')
          ? 'Lab. de Química: Sin acceso ahora'
          : 'Lab. de Química: accesible'}
      </p>
    </>
  )
}

describe('EtiquetaFechaSimulada (2.3)', () => {
  it('con ?ahora= muestra "Fecha simulada: 05/11 10:00" y la vigencia usa esa fecha', () => {
    const fecha = leerFechaSimulada({ search: '?ahora=2026-11-05T10:00-03:00', storage: almacen() })
    const controlador = crearControladorCierres({
      grafo: grafoReal(),
      cierres: cierresEjemplo(),
      lugares: LUGARES,
      reloj: crearReloj(fecha),
    })
    render(<Prueba fecha={fecha} controlador={controlador} />)
    expect(screen.getByRole('status')).toHaveTextContent('Fecha simulada: 05/11 10:00')
    const vigentes = screen.getByRole('list', { name: 'Cierres vigentes' })
    expect(vigentes).toHaveTextContent('obra-entrada-edificio-sur')
    expect(vigentes).toHaveTextContent('escalera-radio')
    expect(screen.getByText('Lab. de Química: Sin acceso ahora')).toBeInTheDocument()

    const r = controlador.calcularRuta({
      origen: lugar('enfermeria').puertas,
      destino: lugar('aula-101').puertas,
      criterio: 'mas-corta',
    })
    expect(r.tipo === 'ruta' && r.nodos).not.toContain('entrada-ed-sur-oeste-sur')
    controlador.detener()
  })

  it('con una fecha simulada anterior a la obra, la obra no está vigente', () => {
    const fecha = leerFechaSimulada({ search: '?ahora=2026-11-02T18:00-03:00', storage: almacen() })
    const controlador = crearControladorCierres({
      grafo: grafoReal(),
      cierres: cierresEjemplo(),
      lugares: LUGARES,
      reloj: crearReloj(fecha),
    })
    render(<Prueba fecha={fecha} controlador={controlador} />)
    expect(screen.getByRole('status')).toHaveTextContent('Fecha simulada: 02/11 18:00')
    expect(screen.getByRole('list', { name: 'Cierres vigentes' })).not.toHaveTextContent(
      'obra-entrada-edificio-sur',
    )
    act(() => controlador.detener())
  })

  it('sin fecha simulada no muestra nada', () => {
    const { container } = render(<EtiquetaFechaSimulada fecha={null} />)
    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByRole('status')).toBeNull()
  })
})
