import { render, screen } from '@testing-library/react'
import { MapContainer, Pane } from 'react-leaflet'
import { describe, expect, it, vi } from 'vitest'
import { crearControladorCierres, crearReloj, parsearFecha } from '../../cierres/index.ts'
import { LUGARES, cierresEjemplo, grafoReal } from '../../cierres/test/datos.ts'
import { componerCapas } from '../integraciones.ts'
import { PANES } from '../mapa/config.ts'
import { CRS_PLANO } from '../mapa/coordenadas.ts'
import MapaDoble from '../mapa/MapaDoble.tsx'
import { PLANO_DE_PRUEBA } from '../test/renderizar.tsx'
import CapaCierresMapa from './CapaCierresMapa.tsx'
import { ContextoCierres } from './contexto.ts'

vi.hoisted(() => {
  const proto = (
    globalThis as unknown as { SVGSVGElement?: { prototype: Record<string, unknown> } }
  ).SVGSVGElement?.prototype
  if (proto && !proto.createSVGRect) proto.createSVGRect = () => ({})
})

const controlador = () =>
  crearControladorCierres({
    grafo: grafoReal(),
    cierres: cierresEjemplo(),
    lugares: LUGARES,
    reloj: crearReloj(parsearFecha('2026-11-05T10:00-03:00')),
  })

describe('CapaCierresMapa', () => {
  it('dentro del mapa dibuja los cierres vigentes del controlador', () => {
    render(
      <ContextoCierres.Provider value={controlador()}>
        <MapContainer
          crs={CRS_PLANO}
          center={[2000, 800]}
          zoom={0}
          style={{ width: 390, height: 844 }}
        >
          <Pane name={PANES.cierres.nombre} />
          <CapaCierresMapa />
        </MapContainer>
      </ContextoCierres.Provider>,
    )
    expect(
      screen.getByTitle('Tramo cerrado: Obra en la entrada oeste del Edificio Sur'),
    ).toBeInTheDocument()
  })

  it('en el doble del mapa (jsdom, sin MapContainer) no dibuja nada ni falla', () => {
    render(
      <ContextoCierres.Provider value={controlador()}>
        <MapaDoble
          plano={PLANO_DE_PRUEBA}
          encuadre={{ tipo: 'campus' }}
          marcador={null}
          margenes={{ arriba: 0, abajo: 0, izquierda: 0, derecha: 0, abajoColapsada: 0 }}
          recentrar={0}
          escritorio={false}
          Capas={CapaCierresMapa}
        />
      </ContextoCierres.Provider>,
    )
    expect(screen.getByTestId('mapa-doble')).toBeEmptyDOMElement()
  })

  it('sin controlador (cargando) no dibuja nada', () => {
    render(
      <MapContainer
        crs={CRS_PLANO}
        center={[2000, 800]}
        zoom={0}
        style={{ width: 390, height: 844 }}
      >
        <CapaCierresMapa />
      </MapContainer>,
    )
    expect(document.querySelectorAll('.cierre__icono')).toHaveLength(0)
  })
})

describe('componerCapas', () => {
  it('monta todas las capas en orden e ignora los null', () => {
    const A = () => <span>capa A</span>
    const B = () => <span>capa B</span>
    const Capas = componerCapas(A, null, B)!
    const { container } = render(<Capas />)
    expect(container.textContent).toBe('capa Acapa B')
    expect(componerCapas(A)).toBe(A)
    expect(componerCapas(null)).toBeNull()
    expect(componerCapas()).toBeNull()
  })
})
