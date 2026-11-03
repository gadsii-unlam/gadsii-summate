/**
 * Visor del plano con Leaflet y react-leaflet (design.md, D4). Se carga con `React.lazy` desde
 * `App`, así los tests de componentes (que usan `MapaDoble`) no cargan Leaflet.
 */
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useMemo, useRef, useState } from 'react'
import { ImageOverlay, MapContainer, Marker, Pane, ZoomControl, useMap } from 'react-leaflet'
import type { PlanoBase } from '../../datos/index.ts'
import { COLORES_MARCADORES } from '../tema/tokens.ts'
import { TEXTOS } from '../textos.ts'
import {
  ENCUADRE_INICIAL,
  MARGEN_LIMITES,
  PANES,
  ZOOM_ACERCAR,
  ZOOM_LUGAR,
  ZOOM_MAXIMO,
  cajaPlano,
} from './config.ts'
import { CRS_PLANO, aLatLng, aLatLngBounds } from './coordenadas.ts'
import type { Encuadre, Margenes, PropsMapa } from './tipos.ts'
import './mapa.css'

const ESPACIO = 16

const ICONO_PIN = L.divIcon({
  className: 'mapa__pin',
  html: `<svg aria-hidden="true" width="36" height="44" viewBox="0 0 24 29"><path d="M12 1.5C7.86 1.5 4.5 4.86 4.5 9c0 5.6 7.5 18 7.5 18s7.5-12.4 7.5-18c0-4.14-3.36-7.5-7.5-7.5z" fill="${COLORES_MARCADORES.destino}" stroke="${COLORES_MARCADORES.destinoBorde}" stroke-width="1.2"/><circle cx="12" cy="9" r="2.8" fill="${COLORES_MARCADORES.destinoBorde}"/></svg>`,
  iconSize: [36, 44],
  iconAnchor: [18, 42],
})

function opcionesPadding(m: Margenes): L.FitBoundsOptions {
  return {
    paddingTopLeft: [m.izquierda + ESPACIO, m.arriba + ESPACIO],
    paddingBottomRight: [m.derecha + ESPACIO, m.abajo + ESPACIO],
  }
}

/** Centra `punto` en la franja visible entre la tarjeta y la hoja, con el zoom dado. */
function centrarEnFranja(
  mapa: L.Map,
  punto: { x: number; y: number },
  zoom: number,
  m: Margenes,
  animar: boolean,
) {
  const tam = mapa.getSize()
  const cx = m.izquierda + (tam.x - m.izquierda - m.derecha) / 2
  const cy = m.arriba + (tam.y - m.arriba - m.abajo) / 2
  const desplazamiento = L.point(cx - tam.x / 2, cy - tam.y / 2)
  const centro = mapa.unproject(mapa.project(aLatLng(punto), zoom).subtract(desplazamiento), zoom)
  mapa.setView(centro, zoom, { animate: animar })
}

function estaEnFranja(mapa: L.Map, punto: { x: number; y: number }, m: Margenes): boolean {
  const p = mapa.latLngToContainerPoint(aLatLng(punto))
  const tam = mapa.getSize()
  return (
    p.x >= m.izquierda + ESPACIO &&
    p.x <= tam.x - m.derecha - ESPACIO &&
    p.y >= m.arriba + ESPACIO + 44 &&
    p.y <= tam.y - m.abajo - ESPACIO
  )
}

/**
 * Plano vectorial: el SVG entero en una sola imagen. El navegador lo vuelve a dibujar al terminar
 * cada zoom, así que se ve nítido en cualquier nivel y densidad de pantalla, y no se arma de a
 * pedazos al moverse. El service worker lo guarda al instalar (tolerar-senal-irregular).
 * Si el SVG no se puede mostrar, se usa la imagen única de respaldo.
 */
function CapaPlano({ plano }: { plano: PlanoBase }) {
  const limites = useMemo(() => aLatLngBounds(cajaPlano(plano)), [plano])
  const [respaldo, setRespaldo] = useState(false)

  // Con `key` distinto, React arma una capa nueva (react-leaflet no actualiza `className`).
  if (respaldo) {
    return (
      <ImageOverlay
        key="respaldo"
        url={plano.respaldo.url}
        bounds={limites}
        className="mapa__respaldo"
      />
    )
  }
  return (
    <ImageOverlay
      key="plano"
      url={plano.url}
      bounds={limites}
      className="mapa__plano"
      eventHandlers={{ error: () => setRespaldo(true) }}
    />
  )
}

/** Zoom mínimo, encuadres, recentrar y seguimiento del lugar elegido. */
function Controlador({ plano, encuadre, marcador, margenes, recentrar }: PropsMapa) {
  const mapa = useMap()
  const interactuo = useRef(false)
  const ultimo = useRef({ encuadre, margenes })
  useEffect(() => {
    ultimo.current = { encuadre, margenes }
  })

  // Zoom mínimo: el campus entero entra en la pantalla.
  useEffect(() => {
    const limites = aLatLngBounds(cajaPlano(plano))
    const ajustar = () => {
      const z = Math.floor(mapa.getBoundsZoom(limites, false) * 4) / 4
      mapa.setMinZoom(Math.min(z, ZOOM_MAXIMO))
    }
    ajustar()
    mapa.on('resize', ajustar)
    return () => {
      mapa.off('resize', ajustar)
    }
  }, [mapa, plano])

  // Zoom y centro a la vista en el DOM (para las pruebas e2e y la depuración).
  useEffect(() => {
    const el = mapa.getContainer()
    const publicar = () => {
      const c = mapa.getCenter()
      el.dataset.zoom = String(mapa.getZoom())
      el.dataset.zoomMinimo = String(mapa.getMinZoom())
      el.dataset.centro = `${c.lng.toFixed(1)},${c.lat.toFixed(1)}`
    }
    publicar()
    mapa.on('moveend zoomend', publicar)
    return () => {
      mapa.off('moveend zoomend', publicar)
    }
  }, [mapa])

  // Doble toque: acerca un nivel centrado en el punto tocado. Leaflet depende del `dblclick`
  // nativo, que Safari en iOS y algunos Chrome no mandan con el dedo.
  useEffect(() => {
    const el = mapa.getContainer()
    let ultimo: { t: number; x: number; y: number } | null = null
    let multiples = false
    const alEmpezar = (e: TouchEvent) => {
      if (e.touches.length > 1) multiples = true
    }
    const alTerminar = (e: TouchEvent) => {
      if (e.touches.length > 0) return
      const t = e.changedTouches[0]
      if (!t || multiples) {
        multiples = false
        ultimo = null
        return
      }
      const ahora = performance.now()
      if (
        ultimo &&
        ahora - ultimo.t < 320 &&
        Math.hypot(t.clientX - ultimo.x, t.clientY - ultimo.y) < 30
      ) {
        e.preventDefault()
        ultimo = null
        const r = el.getBoundingClientRect()
        const punto = L.point(t.clientX - r.left, t.clientY - r.top)
        mapa.setZoomAround(punto, Math.min(mapa.getZoom() + 1, mapa.getMaxZoom()))
        return
      }
      ultimo = { t: ahora, x: t.clientX, y: t.clientY }
    }
    el.addEventListener('touchstart', alEmpezar, { passive: true })
    el.addEventListener('touchend', alTerminar, { passive: false })
    return () => {
      el.removeEventListener('touchstart', alEmpezar)
      el.removeEventListener('touchend', alTerminar)
    }
  }, [mapa])

  // Cualquier gesto del usuario deja de re-encuadrar automáticamente.
  useEffect(() => {
    const el = mapa.getContainer()
    const marcar = () => {
      interactuo.current = true
    }
    el.addEventListener('pointerdown', marcar)
    el.addEventListener('wheel', marcar, { passive: true })
    el.addEventListener('keydown', marcar)
    return () => {
      el.removeEventListener('pointerdown', marcar)
      el.removeEventListener('wheel', marcar)
      el.removeEventListener('keydown', marcar)
    }
  }, [mapa])

  const encuadrar = (e: Encuadre, m: Margenes, animar: boolean) => {
    if (e.tipo === 'lugar') {
      centrarEnFranja(mapa, e, Math.max(mapa.getZoom(), ZOOM_LUGAR), m, animar)
    } else {
      const caja = e.tipo === 'ruta' ? e.caja : ENCUADRE_INICIAL
      // El campus se encuadra contra la hoja colapsada: así ningún edificio queda tapado aunque
      // la hoja abra más alta (indicación de primer uso).
      const margen = e.tipo === 'campus' ? { ...m, abajo: Math.min(m.abajo, m.abajoColapsada) } : m
      mapa.fitBounds(aLatLngBounds(caja), { ...opcionesPadding(margen), animate: animar })
    }
  }

  // Encuadre inicial: se repite mientras se miden la tarjeta y la hoja, hasta que el usuario
  // toque el mapa.
  const { arriba, abajo, izquierda, derecha, abajoColapsada } = margenes
  useEffect(() => {
    if (interactuo.current || ultimo.current.encuadre.tipo !== 'campus') return
    encuadrar({ tipo: 'campus' }, { arriba, abajo, izquierda, derecha, abajoColapsada }, false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapa, arriba, izquierda, derecha, abajoColapsada])

  // Botón de recentrar.
  const primerRecentrar = useRef(recentrar)
  useEffect(() => {
    if (recentrar === primerRecentrar.current) return
    encuadrar(ultimo.current.encuadre, ultimo.current.margenes, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentrar])

  // Lugar elegido: si el pin no queda en la franja visible, se mueve el plano (sin cambiar el
  // zoom). Se espera a que la hoja termine de anclar.
  const mx = marcador?.x
  const my = marcador?.y
  useEffect(() => {
    if (mx === undefined || my === undefined) return
    const id = window.setTimeout(() => {
      const m = ultimo.current.margenes
      if (!estaEnFranja(mapa, { x: mx, y: my }, m)) {
        // Fuera de la franja: se centra y, si hace falta, se acerca hasta poder leer el plano.
        centrarEnFranja(mapa, { x: mx, y: my }, Math.max(mapa.getZoom(), ZOOM_ACERCAR), m, true)
      }
    }, 60)
    return () => window.clearTimeout(id)
  }, [mapa, mx, my, abajo])

  return null
}

export default function MapaCampus(props: PropsMapa) {
  const { plano, marcador, escritorio, Capas } = props
  const limites = useMemo(() => aLatLngBounds(cajaPlano(plano)), [plano])
  const maxBounds = useMemo(() => limites.pad(MARGEN_LIMITES), [limites])
  const centro = useMemo(
    () =>
      aLatLng({
        x: (ENCUADRE_INICIAL.x1 + ENCUADRE_INICIAL.x2) / 2,
        y: (ENCUADRE_INICIAL.y1 + ENCUADRE_INICIAL.y2) / 2,
      }),
    [],
  )

  return (
    <MapContainer
      className="mapa"
      crs={CRS_PLANO}
      center={centro}
      zoom={-1.5}
      minZoom={-3}
      maxZoom={ZOOM_MAXIMO}
      zoomSnap={0.25}
      zoomDelta={0.5}
      wheelPxPerZoomLevel={120}
      maxBounds={maxBounds}
      maxBoundsViscosity={1}
      inertia
      keyboard
      doubleClickZoom
      touchZoom
      bounceAtZoomLimits={false}
      zoomControl={false}
      attributionControl={false}
    >
      <Pane name={PANES.plano.nombre} style={{ zIndex: PANES.plano.zIndex }}>
        <CapaPlano plano={plano} />
      </Pane>
      <Pane name={PANES.cierres.nombre} style={{ zIndex: PANES.cierres.zIndex }} />
      <Pane name={PANES.ruta.nombre} style={{ zIndex: PANES.ruta.zIndex }} />
      <Pane name={PANES.marcadores.nombre} style={{ zIndex: PANES.marcadores.zIndex }}>
        {marcador && (
          <Marker
            position={aLatLng(marcador)}
            icon={ICONO_PIN}
            interactive={false}
            keyboard={false}
            eventHandlers={{
              add: (e) => {
                ;(e.target as L.Marker).getElement()?.setAttribute('aria-hidden', 'true')
              },
            }}
          />
        )}
      </Pane>
      <Controlador {...props} />
      {escritorio && (
        <ZoomControl
          position="bottomright"
          zoomInTitle={TEXTOS.acercar}
          zoomOutTitle={TEXTOS.alejar}
        />
      )}
      {Capas && <Capas />}
    </MapContainer>
  )
}
