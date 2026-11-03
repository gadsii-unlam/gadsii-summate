import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MapContainer, Pane } from 'react-leaflet'
import { describe, expect, it, vi } from 'vitest'
import { capaDeCierres, cierresVigentes, parsearFecha } from '../../cierres/index.ts'
import { cierresEjemplo, grafoReal } from '../../cierres/test/datos.ts'
import { PANES } from '../mapa/config.ts'
import { CRS_PLANO } from '../mapa/coordenadas.ts'
import CapaCierres from './CapaCierres.tsx'

// jsdom no implementa SVG de verdad: Leaflet decide si usa SVG mirando `createSVGRect`.
vi.hoisted(() => {
  const proto = (
    globalThis as unknown as { SVGSVGElement?: { prototype: Record<string, unknown> } }
  ).SVGSVGElement?.prototype
  if (proto && !proto.createSVGRect) proto.createSVGRect = () => ({})
})

const ZONA = 'America/Argentina/Buenos_Aires'

function renderCapa(fecha: string) {
  const vigentes = cierresVigentes(cierresEjemplo(), parsearFecha(fecha)!)
  const tramos = capaDeCierres(grafoReal(), vigentes)
  const r = render(
    <MapContainer crs={CRS_PLANO} center={[2000, 800]} zoom={0} style={{ width: 390, height: 844 }}>
      <Pane name={PANES.cierres.nombre} style={{ zIndex: PANES.cierres.zIndex }}>
        <CapaCierres tramos={tramos} zonaHoraria={ZONA} />
      </Pane>
    </MapContainer>,
  )
  return { ...r, tramos }
}

describe('CapaCierres', () => {
  it('dibuja líneas rojas punteadas e íconos de 44 px en el pane de cierres', () => {
    const { container, tramos } = renderCapa('2026-11-05T10:00-03:00')
    const pane = container.querySelector('.leaflet-cierres-pane')!
    const lineas = pane.querySelectorAll('path')
    expect(lineas.length).toBe(tramos.reduce((n, t) => n + t.segmentos.length, 0))
    for (const l of lineas) {
      expect(l.getAttribute('stroke')).toBe('#D93025')
      expect(l.getAttribute('stroke-dasharray')).toBe('6 6')
      expect(l.getAttribute('stroke-width')).toBe('4')
    }
    const iconos = pane.querySelectorAll<HTMLElement>('.cierre__icono')
    expect(iconos).toHaveLength(3)
    for (const i of iconos) {
      expect(i.style.width).toBe('44px')
      expect(i.style.height).toBe('44px')
    }
    expect(
      screen.getByTitle('Tramo cerrado: Obra en la entrada oeste del Edificio Sur'),
    ).toBeInTheDocument()
  })

  it('no dibuja los cierres que no están vigentes', () => {
    const { container } = renderCapa('2026-11-02T18:00-03:00')
    expect(
      screen.queryByTitle('Tramo cerrado: Obra en la entrada oeste del Edificio Sur'),
    ).toBeNull()
    expect(container.querySelectorAll('.cierre__icono')).toHaveLength(2)
  })

  it('al tocar el ícono muestra el motivo y hasta cuándo', async () => {
    renderCapa('2026-11-05T10:00-03:00')
    fireEvent.click(screen.getByTitle('Tramo cerrado: Obra en la entrada oeste del Edificio Sur'))
    await waitFor(() =>
      expect(screen.getByText('Cerrado hasta el 14/11 a las 23:00')).toBeInTheDocument(),
    )
    expect(screen.getByText('Obra en la entrada oeste del Edificio Sur')).toBeInTheDocument()
  })
})
