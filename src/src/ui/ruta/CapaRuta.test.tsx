import { fireEvent, render, screen } from '@testing-library/react'
import { MapContainer, Pane } from 'react-leaflet'
import { describe, expect, it, vi } from 'vitest'
import { calcularRuta, type RutaEncontrada } from '../../rutas/index.ts'
import { grafoReal } from '../../rutas/test/datos-reales.ts'
import { PANES } from '../mapa/config.ts'
import { CRS_PLANO } from '../mapa/coordenadas.ts'
import CapaRuta, { type PropsCapaRuta } from './CapaRuta.tsx'
import {
  ESTILO_ALTERNATIVA,
  ESTILO_RUTA,
  ESTILO_SALA_DESTINO,
  ORDEN_CAPAS,
  PANES_RUTA,
} from './estilo.ts'
import { geometriaRuta } from './geometria.ts'
import LeyendaRuta from './LeyendaRuta.tsx'
import { DATOS_REALES, lugarReal } from './test/datos.ts'

// jsdom no implementa SVG de verdad: Leaflet decide si usa SVG mirando `createSVGRect`.
vi.hoisted(() => {
  const proto = (
    globalThis as unknown as { SVGSVGElement?: { prototype: Record<string, unknown> } }
  ).SVGSVGElement?.prototype
  if (proto && !proto.createSVGRect) proto.createSVGRect = () => ({})
})

function ruta(origenId: string, destinoId: string, criterio: 'mas-corta' | 'resguardada') {
  const r = calcularRuta(grafoReal(), {
    origen: lugarReal(origenId).puertas,
    destino: lugarReal(destinoId).puertas,
    criterio,
  })
  if (r.tipo !== 'ruta') throw new Error(r.tipo)
  return r as RutaEncontrada
}

function renderCapa(props: Partial<PropsCapaRuta> & { elegida: PropsCapaRuta['elegida'] }) {
  return render(
    <MapContainer crs={CRS_PLANO} center={[1800, 600]} zoom={0} style={{ width: 390, height: 844 }}>
      <Pane name={PANES.cierres.nombre} style={{ zIndex: PANES.cierres.zIndex }} />
      <Pane name={PANES.ruta.nombre} style={{ zIndex: PANES.ruta.zIndex }} />
      <Pane name={PANES.marcadores.nombre} style={{ zIndex: PANES.marcadores.zIndex }} />
      <CapaRuta nombreOrigen="Origen" nombreDestino="Destino" {...props} />
    </MapContainer>,
  )
}

const zIndex = (el: Element | null) => Number((el as HTMLElement | null)?.style.zIndex)

describe('CapaRuta', () => {
  const corta = ruta('direccion-alumnos', 'dpto-cs-salud', 'mas-corta')
  const resguardada = ruta('direccion-alumnos', 'dpto-cs-salud', 'resguardada')

  it('dibuja borde #174EA6 de 7 px y relleno de 4 px, continuos; los tramos al aire libre en celeste', () => {
    const geo = geometriaRuta(corta, DATOS_REALES)
    const { container } = renderCapa({ elegida: geo })
    const pane = container.querySelector('.leaflet-ruta-pane')!
    const bordes = [...pane.querySelectorAll('path.ruta__borde')]
    const rellenos = [...pane.querySelectorAll('path.ruta__relleno')]
    // Bajo techo (Edificio Oeste) · al aire libre (vereda) · bajo techo (Edificio Este).
    expect(bordes).toHaveLength(3)
    expect(rellenos).toHaveLength(3)
    for (const b of bordes) {
      expect(b.getAttribute('stroke')).toBe(ESTILO_RUTA.borde)
      expect(b.getAttribute('stroke-width')).toBe('7')
      expect(b.getAttribute('stroke-linecap')).toBe('round')
    }
    for (const r of rellenos) expect(r.getAttribute('stroke-width')).toBe('4')
    expect(rellenos.map((r) => r.getAttribute('stroke'))).toEqual([
      ESTILO_RUTA.relleno,
      ESTILO_RUTA.rellenoAireLibre,
      ESTILO_RUTA.relleno,
    ])
    expect(rellenos[1]!.getAttribute('class')).toMatch(/--aire/)
    expect(
      [...pane.querySelectorAll('path')].every((p) => !p.getAttribute('stroke-dasharray')),
    ).toBe(true)
  })

  it('marca el origen con un círculo azul con borde blanco y el destino con un pin rojo', () => {
    const { container } = renderCapa({ elegida: geometriaRuta(corta, DATOS_REALES) })
    const marcadores = container.querySelector('.leaflet-marcadores-pane')!
    const origen = marcadores.querySelector<HTMLElement>('.ruta__marcador--origen .ruta__origen')!
    expect(origen.style.background).toMatch(/26, 115, 232|#1a73e8/i)
    expect(origen.style.border).toMatch(/3px solid/)
    const pin = marcadores.querySelector('.ruta__marcador--destino path')!
    expect(pin.getAttribute('fill')).toBe('#EA4335')
    expect(screen.getByTitle('Destino: Destino')).toBeInTheDocument()
    expect(marcadores.querySelector('.ruta__marcador--flecha')).toBeNull()
  })

  it('el pin y el círculo van en las puertas que usa la ruta (Gimnasio por acceso-gimnasio-sur)', () => {
    const r = ruta('aula-121', 'gimnasio', 'mas-corta')
    expect(r.puertaDestino).toBe('acceso-gimnasio-sur')
    const geo = geometriaRuta(r, DATOS_REALES)
    const n = DATOS_REALES.grafo.nodos[DATOS_REALES.grafo.indiceNodo.get(r.puertaDestino)!]!
    expect(geo.destino).toEqual([n.x, n.y])
  })

  it('desde una entrada al campus agrega la flecha de sentido sobre el primer tramo', () => {
    const r = ruta('entrada-campus-florencio-varela', 'aula-121', 'mas-corta')
    const geo = geometriaRuta(r, DATOS_REALES)
    expect(geo.flecha).not.toBeNull()
    // El primer tramo sube (norte): la flecha apunta a −90°.
    expect(geo.flecha!.grados).toBeCloseTo(-90)
    const { container } = renderCapa({ elegida: geo })
    expect(container.querySelector('.ruta__marcador--flecha')).not.toBeNull()
  })

  it('la alternativa va en gris por debajo de la elegida, y tocarla avisa', () => {
    const alTocarAlternativa = vi.fn()
    const { container } = renderCapa({
      elegida: geometriaRuta(resguardada, DATOS_REALES),
      alternativa: corta.polilinea,
      alTocarAlternativa,
    })
    const pane = container.querySelector(`.leaflet-${PANES_RUTA.alternativa.nombre}-pane`)!
    const lineas = [...pane.querySelectorAll('path.ruta__alternativa')]
    expect(lineas.map((l) => l.getAttribute('stroke'))).toEqual([
      ESTILO_ALTERNATIVA.borde,
      ESTILO_ALTERNATIVA.relleno,
    ])
    expect(lineas.every((l) => l.getAttribute('stroke-dasharray') === null)).toBe(true)
    expect(zIndex(pane)).toBeLessThan(zIndex(container.querySelector('.leaflet-ruta-pane')))
    // Encima, una línea invisible más ancha es el área de toque (12 px a cada lado).
    const toque = pane.querySelector('path.ruta__alternativa-toque')!
    expect(toque.getAttribute('stroke-opacity')).toBe('0')
    expect(toque.getAttribute('stroke-width')).toBe(String(ESTILO_ALTERNATIVA.grosorBorde + 24))
    expect(lineas.every((l) => !l.classList.contains('leaflet-interactive'))).toBe(true)
    fireEvent.click(toque)
    expect(alTocarAlternativa).toHaveBeenCalledTimes(1)
  })

  it('las líneas van en SVG, no en Canvas (el arrastre sin cortes se prueba en e2e)', () => {
    const geo = geometriaRuta(corta, DATOS_REALES)
    const { container } = renderCapa({ elegida: geo, alternativa: resguardada.polilinea })
    expect(container.querySelector('.leaflet-ruta-pane > svg')).not.toBeNull()
    expect(container.querySelector('canvas')).toBeNull()
  })

  it('el tramo resaltado va con halo blanco y relleno de 6 px por encima de la ruta', () => {
    const geo = geometriaRuta(corta, DATOS_REALES)
    const { container } = renderCapa({ elegida: geo, resaltado: geo.partes[2]!.puntos })
    const pane = container.querySelector(`.leaflet-${PANES_RUTA.resaltado.nombre}-pane`)!
    expect(pane.querySelector('path.ruta__resaltado-halo')!.getAttribute('stroke')).toBe('#FFFFFF')
    expect(pane.querySelector('path.ruta__resaltado')!.getAttribute('stroke-width')).toBe('6')
    expect(zIndex(pane)).toBeGreaterThan(zIndex(container.querySelector('.leaflet-ruta-pane')))
    expect(container.querySelector('.ruta__marcador--maniobra')).not.toBeNull()
  })

  it('con sala de destino: la pinta en rojo debajo de la ruta y cambia el pin por un punto en la puerta', () => {
    const sala = lugarReal('dpto-cs-salud').sala!
    expect(sala.length).toBeGreaterThanOrEqual(3)
    const { container } = renderCapa({
      elegida: geometriaRuta(corta, DATOS_REALES),
      salaDestino: sala,
    })
    const pane = container.querySelector(`.leaflet-${PANES_RUTA.destino.nombre}-pane`)!
    const poligono = pane.querySelector('path.ruta__sala-destino')!
    expect(poligono.getAttribute('fill')).toBe(ESTILO_SALA_DESTINO.relleno)
    expect(poligono.getAttribute('stroke')).toBe(ESTILO_SALA_DESTINO.borde)
    expect(zIndex(pane)).toBeLessThan(zIndex(container.querySelector('.leaflet-ruta-pane')))
    const destino = container.querySelector('.ruta__marcador--destino')!
    expect(destino.classList.contains('ruta__marcador--puerta')).toBe(true)
    expect(destino.querySelector('svg')).toBeNull()
    expect(destino.getAttribute('title')).toBe('Destino: Destino')
  })

  it('sin sala de destino queda el pin; con la ruta en pantalla el plano va en gris', () => {
    const { container, unmount } = renderCapa({ elegida: geometriaRuta(corta, DATOS_REALES) })
    expect(container.querySelector('path.ruta__sala-destino')).toBeNull()
    const destino = container.querySelector('.ruta__marcador--destino')!
    expect(destino.classList.contains('ruta__marcador--puerta')).toBe(false)
    expect(destino.querySelector('svg')).not.toBeNull()
    const mapa = container.querySelector('.leaflet-container')!
    expect(mapa.classList.contains('mapa--con-ruta')).toBe(true)
    unmount()
    expect(mapa.classList.contains('mapa--con-ruta')).toBe(false)
  })

  it('la capa de la ruta queda por encima de la de cierres (plano → cierres → alternativa → ruta → resaltado → marcadores)', () => {
    const { container } = renderCapa({
      elegida: geometriaRuta(resguardada, DATOS_REALES),
      alternativa: corta.polilinea,
      resaltado: corta.polilinea.slice(0, 2),
    })
    const z = (nombre: string) => zIndex(container.querySelector(`.leaflet-${nombre}-pane`))
    expect(z(PANES.ruta.nombre)).toBeGreaterThan(z(PANES.cierres.nombre))
    const enDom = ORDEN_CAPAS.slice(1).map((p) => z(p.nombre))
    expect(enDom).toEqual([...enDom].sort((a, b) => a - b))
    expect(new Set(enDom).size).toBe(enDom.length)
  })
})

describe('LeyendaRuta', () => {
  it('Aula 121 → Aula 110 (todo bajo techo): sin leyenda', () => {
    const r = ruta('aula-121', 'aula-110', 'mas-corta')
    const { container } = render(
      <LeyendaRuta tieneAireLibre={geometriaRuta(r, DATOS_REALES).tieneAireLibre} />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('Dir. de Alumnos → Dpto. de Cs. de la Salud: "Bajo techo" y "Al aire libre"', () => {
    const r = ruta('direccion-alumnos', 'dpto-cs-salud', 'mas-corta')
    render(
      <LeyendaRuta tieneAireLibre={geometriaRuta(r, DATOS_REALES).tieneAireLibre} arriba={140} />,
    )
    const leyenda = screen.getByRole('list', { name: 'Referencias de la ruta' })
    expect(leyenda).toHaveTextContent('Bajo techo')
    expect(leyenda).toHaveTextContent('Al aire libre')
    expect(leyenda.style.top).toBe('140px')
  })
})
