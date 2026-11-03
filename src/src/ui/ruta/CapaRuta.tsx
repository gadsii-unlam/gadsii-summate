/**
 * Capa de la ruta en el visor (design.md de mostrar-ruta-e-indicaciones, decisiones 2 a 5, 8 y
 * 12), al estilo de Google Maps: polilínea azul con borde oscuro, tramos al aire libre en celeste,
 * alternativa en gris tocable por debajo, tramo resaltado con halo blanco y marcadores de origen
 * (círculo azul con borde blanco) y destino. El destino es la sala del lugar pintada de rojo, con
 * un punto en la puerta; si el lugar no tiene sala en el plano, el pin rojo anclado en la punta.
 * Mientras la capa está montada el plano se ve en gris (`.mapa--con-ruta`).
 *
 * Se monta dentro del `MapContainer` (usa react-leaflet). Recibe todo por props: no calcula rutas.
 */
import L from 'leaflet'
import { useEffect, useMemo, useRef } from 'react'
import { Marker, Pane, Polygon, Polyline, useMap } from 'react-leaflet'
import type { Caja } from '../../datos/index.ts'
import type { PuntoMapa } from '../../rutas/index.ts'
import { aLatLng, aLatLngBounds } from '../mapa/coordenadas.ts'
import type { Margenes } from '../mapa/tipos.ts'
import { SIN_RECORTE, rendererVectorial } from '../mapa/vectores.ts'
import { COLORES_MARCADORES } from '../tema/tokens.ts'
import {
  ESTILO_ALTERNATIVA,
  ESTILO_RESALTADO,
  ESTILO_RUTA,
  ESTILO_SALA_DESTINO,
  MARCADOR_DESTINO,
  MARCADOR_ORIGEN,
  MARCADOR_PUERTA_DESTINO,
  PANES_RUTA,
  TOLERANCIA_TOQUE,
  ZOOM_MAXIMO_ENCUADRE,
} from './estilo.ts'
import type { GeometriaRuta } from './geometria.ts'
import { TEXTOS_RUTA } from './textos.ts'
import './ruta.css'

export interface PropsCapaRuta {
  /** Geometría de la ruta elegida (`geometriaRuta`). */
  elegida: GeometriaRuta
  /** Polilínea de la alternativa no elegida (o `null` si hay una sola ruta). */
  alternativa?: readonly PuntoMapa[] | null
  /** Tocar la línea gris equivale a tocar su chip. */
  alTocarAlternativa?: () => void
  /** Puntos del paso tocado en la lista (se dibujan resaltados) y punto de la maniobra. */
  resaltado?: readonly PuntoMapa[] | null
  /** Contorno de la sala del lugar de destino (px del plano); sin sala se usa el pin. */
  salaDestino?: readonly PuntoMapa[] | null
  /** Nombres de origen y destino (para los títulos de los marcadores). */
  nombreOrigen?: string
  nombreDestino?: string
  /**
   * Caja a encuadrar y una clave que cambia cada vez que hay que volver a encuadrar (ruta nueva,
   * cambio de alternativa o paso tocado). Si el usuario mueve el mapa no se reencuadra solo.
   */
  encuadre?: { caja: Caja; clave: string | number } | null
  /** Espacio que tapan la tarjeta superior y la hoja (o el panel lateral). */
  margenes?: Margenes
}

const ESPACIO_ENCUADRE = { lateral: 24, vertical: 16 }
/** Espera para encuadrar después de que la hoja ancle. */
const ESPERA_ENCUADRE_MS = 80

const SIN_MARGENES: Margenes = { arriba: 0, abajo: 0, izquierda: 0, derecha: 0, abajoColapsada: 0 }

const aPosiciones = (puntos: readonly PuntoMapa[]) => puntos.map(([x, y]) => aLatLng({ x, y }))

function iconoOrigen(): L.DivIcon {
  const d = MARCADOR_ORIGEN.diametro
  return L.divIcon({
    className: 'ruta__marcador ruta__marcador--origen',
    html: `<span class="ruta__origen" style="width:${d}px;height:${d}px;background:${COLORES_MARCADORES.origen};border:${MARCADOR_ORIGEN.borde}px solid ${COLORES_MARCADORES.origenBorde}"></span>`,
    iconSize: [d + 2 * MARCADOR_ORIGEN.borde, d + 2 * MARCADOR_ORIGEN.borde],
    iconAnchor: [d / 2 + MARCADOR_ORIGEN.borde, d / 2 + MARCADOR_ORIGEN.borde],
  })
}

function iconoDestino(): L.DivIcon {
  const { ancho, alto } = MARCADOR_DESTINO
  return L.divIcon({
    className: 'ruta__marcador ruta__marcador--destino',
    html: `<svg aria-hidden="true" width="${ancho}" height="${alto}" viewBox="0 0 28 40"><path d="M14 1.5C7.1 1.5 1.5 7.1 1.5 14c0 9.4 12.5 24.5 12.5 24.5S26.5 23.4 26.5 14C26.5 7.1 20.9 1.5 14 1.5z" fill="${COLORES_MARCADORES.destino}" stroke="${COLORES_MARCADORES.destinoBorde}" stroke-width="1.5"/><circle cx="14" cy="14" r="4.5" fill="#FFFFFF"/></svg>`,
    iconSize: [ancho, alto],
    // Anclado en la punta del pin.
    iconAnchor: [ancho / 2, alto - 1.5],
  })
}

function iconoPuertaDestino(): L.DivIcon {
  const { diametro: d, borde } = MARCADOR_PUERTA_DESTINO
  return L.divIcon({
    className: 'ruta__marcador ruta__marcador--destino ruta__marcador--puerta',
    html: `<span class="ruta__puerta" style="width:${d}px;height:${d}px;background:${COLORES_MARCADORES.destino};border:${borde}px solid #FFFFFF"></span>`,
    iconSize: [d + 2 * borde, d + 2 * borde],
    iconAnchor: [d / 2 + borde, d / 2 + borde],
  })
}

/** Pone el plano en gris mientras la ruta está en pantalla (la ruta y el destino quedan en color). */
function PlanoEnGris() {
  const mapa = useMap()
  useEffect(() => {
    const contenedor = mapa.getContainer()
    contenedor.classList.add('mapa--con-ruta')
    return () => contenedor.classList.remove('mapa--con-ruta')
  }, [mapa])
  return null
}

function iconoFlecha(grados: number): L.DivIcon {
  return L.divIcon({
    className: 'ruta__marcador ruta__marcador--flecha',
    html: `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" style="transform:rotate(${grados}deg)"><path d="M3 4.5 14 9 3 13.5 6 9z" fill="#FFFFFF" stroke="${ESTILO_RUTA.borde}" stroke-width="1.2" stroke-linejoin="round"/></svg>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  })
}

const ICONO_MANIOBRA = L.divIcon({
  className: 'ruta__marcador ruta__marcador--maniobra',
  html: `<span class="ruta__maniobra"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

/**
 * Una línea en su pane y renderer. `pane`, `renderer`, `interactive`, `className` y `noClip` van
 * como opciones de creación (Leaflet no los cambia con `setStyle`).
 */
function linea(
  clave: string,
  puntos: readonly PuntoMapa[],
  renderer: L.Renderer,
  pane: string,
  estilo: L.PathOptions,
  clase: string,
  eventos?: L.LeafletEventHandlerFnMap,
) {
  const interactiva = Boolean(eventos && Object.keys(eventos).length > 0)
  return (
    <Polyline
      key={`${clave}-${interactiva ? 'i' : 'n'}`}
      positions={aPosiciones(puntos)}
      pane={pane}
      renderer={renderer}
      interactive={interactiva}
      className={clase}
      {...SIN_RECORTE}
      pathOptions={{ lineCap: 'round', lineJoin: 'round', opacity: 1, ...estilo }}
      {...(eventos ? { eventHandlers: eventos } : {})}
    />
  )
}

/** Encuadra la caja cuando cambia la clave (no cuando el usuario mueve el mapa). */
function Encuadrar({
  encuadre,
  margenes,
}: {
  encuadre: { caja: Caja; clave: string | number }
  margenes: Margenes
}) {
  const mapa = useMap()
  // La hoja puede estar cambiando de altura en el mismo toque (tocar un paso la baja a media):
  // se encuadra un instante después, con los márgenes de ese momento.
  const ultimo = useRef({ encuadre, margenes })
  useEffect(() => {
    ultimo.current = { encuadre, margenes }
  })
  const { clave } = encuadre
  useEffect(() => {
    const id = window.setTimeout(() => {
      const { encuadre: e, margenes: m } = ultimo.current
      mapa.fitBounds(aLatLngBounds(e.caja), {
        paddingTopLeft: [
          m.izquierda + ESPACIO_ENCUADRE.lateral,
          m.arriba + ESPACIO_ENCUADRE.vertical,
        ],
        paddingBottomRight: [
          m.derecha + ESPACIO_ENCUADRE.lateral,
          m.abajo + ESPACIO_ENCUADRE.vertical,
        ],
        maxZoom: ZOOM_MAXIMO_ENCUADRE,
      })
    }, ESPERA_ENCUADRE_MS)
    return () => window.clearTimeout(id)
    // Solo la clave dispara el encuadre: si el usuario mueve el mapa, no vuelve solo.
  }, [mapa, clave])
  return null
}

export default function CapaRuta({
  elegida,
  alternativa = null,
  alTocarAlternativa,
  resaltado = null,
  salaDestino = null,
  nombreOrigen = '',
  nombreDestino = '',
  encuadre = null,
  margenes = SIN_MARGENES,
}: PropsCapaRuta) {
  const renderers = useMemo(
    () => ({
      destino: rendererVectorial(PANES_RUTA.destino.nombre),
      alternativa: rendererVectorial(PANES_RUTA.alternativa.nombre),
      ruta: rendererVectorial(PANES_RUTA.ruta.nombre),
      resaltado: rendererVectorial(PANES_RUTA.resaltado.nombre),
    }),
    [],
  )
  const origen = useMemo(() => iconoOrigen(), [])
  const conSala = Boolean(salaDestino && salaDestino.length >= 3)
  const destino = useMemo(() => (conSala ? iconoPuertaDestino() : iconoDestino()), [conSala])
  const flecha = elegida.flecha
  const iconoSentido = useMemo(() => (flecha ? iconoFlecha(flecha.grados) : null), [flecha])

  const tocar = alTocarAlternativa
  const eventosAlternativa = useMemo<L.LeafletEventHandlerFnMap | undefined>(
    () => (tocar ? { click: () => tocar() } : undefined),
    [tocar],
  )

  return (
    <>
      <PlanoEnGris />
      <Pane name={PANES_RUTA.destino.nombre} style={{ zIndex: PANES_RUTA.destino.zIndex }}>
        {conSala && (
          <Polygon
            positions={aPosiciones(salaDestino!)}
            pane={PANES_RUTA.destino.nombre}
            renderer={renderers.destino}
            interactive={false}
            className="ruta__sala-destino"
            {...SIN_RECORTE}
            pathOptions={{
              color: ESTILO_SALA_DESTINO.borde,
              weight: ESTILO_SALA_DESTINO.grosorBorde,
              fillColor: ESTILO_SALA_DESTINO.relleno,
              fillOpacity: ESTILO_SALA_DESTINO.opacidadRelleno,
              lineJoin: 'round',
            }}
          />
        )}
      </Pane>
      <Pane name={PANES_RUTA.alternativa.nombre} style={{ zIndex: PANES_RUTA.alternativa.zIndex }}>
        {alternativa && alternativa.length > 1 && (
          <>
            {linea(
              'ab',
              alternativa,
              renderers.alternativa,
              PANES_RUTA.alternativa.nombre,
              {
                color: ESTILO_ALTERNATIVA.borde,
                weight: ESTILO_ALTERNATIVA.grosorBorde,
              },
              'ruta__alternativa',
            )}
            {linea(
              'ar',
              alternativa,
              renderers.alternativa,
              PANES_RUTA.alternativa.nombre,
              {
                color: ESTILO_ALTERNATIVA.relleno,
                weight: ESTILO_ALTERNATIVA.grosorRelleno,
              },
              'ruta__alternativa',
            )}
            {/* Línea invisible más ancha encima: el área de toque de la alternativa. */}
            {eventosAlternativa &&
              linea(
                'at',
                alternativa,
                renderers.alternativa,
                PANES_RUTA.alternativa.nombre,
                {
                  color: ESTILO_ALTERNATIVA.borde,
                  opacity: 0,
                  weight: ESTILO_ALTERNATIVA.grosorBorde + 2 * TOLERANCIA_TOQUE,
                },
                'ruta__alternativa-toque',
                eventosAlternativa,
              )}
          </>
        )}
      </Pane>

      {/* Ruta elegida: primero todos los bordes y después los rellenos, así las uniones quedan limpias. */}
      {elegida.partes.map((parte, i) =>
        linea(
          `b${i}`,
          parte.puntos,
          renderers.ruta,
          PANES_RUTA.ruta.nombre,
          {
            color: ESTILO_RUTA.borde,
            weight: ESTILO_RUTA.grosorBorde,
          },
          parte.exterior ? 'ruta__borde ruta__borde--aire' : 'ruta__borde',
        ),
      )}
      {elegida.partes.map((parte, i) =>
        linea(
          `r${i}`,
          parte.puntos,
          renderers.ruta,
          PANES_RUTA.ruta.nombre,
          {
            color: parte.exterior ? ESTILO_RUTA.rellenoAireLibre : ESTILO_RUTA.relleno,
            weight: ESTILO_RUTA.grosorRelleno,
          },
          parte.exterior ? 'ruta__relleno ruta__relleno--aire' : 'ruta__relleno',
        ),
      )}

      <Pane name={PANES_RUTA.resaltado.nombre} style={{ zIndex: PANES_RUTA.resaltado.zIndex }}>
        {resaltado && resaltado.length > 1 && (
          <>
            {linea(
              'hh',
              resaltado,
              renderers.resaltado,
              PANES_RUTA.resaltado.nombre,
              {
                color: ESTILO_RESALTADO.halo,
                weight: ESTILO_RESALTADO.grosorHalo,
              },
              'ruta__resaltado-halo',
            )}
            {linea(
              'hr',
              resaltado,
              renderers.resaltado,
              PANES_RUTA.resaltado.nombre,
              {
                color: ESTILO_RESALTADO.relleno,
                weight: ESTILO_RESALTADO.grosorRelleno,
              },
              'ruta__resaltado',
            )}
          </>
        )}
      </Pane>

      {resaltado && resaltado[0] && (
        <Marker
          pane={PANES_RUTA.marcadores.nombre}
          position={aLatLng({ x: resaltado[0][0], y: resaltado[0][1] })}
          icon={ICONO_MANIOBRA}
          interactive={false}
          keyboard={false}
        />
      )}
      {flecha && iconoSentido && (
        <Marker
          pane={PANES_RUTA.marcadores.nombre}
          position={aLatLng({ x: flecha.posicion[0], y: flecha.posicion[1] })}
          icon={iconoSentido}
          interactive={false}
          keyboard={false}
          title={TEXTOS_RUTA.sentido}
        />
      )}
      <Marker
        pane={PANES_RUTA.marcadores.nombre}
        position={aLatLng({ x: elegida.origen[0], y: elegida.origen[1] })}
        icon={origen}
        interactive={false}
        keyboard={false}
        title={nombreOrigen ? TEXTOS_RUTA.origenMapa(nombreOrigen) : undefined}
        alt={nombreOrigen ? TEXTOS_RUTA.origenMapa(nombreOrigen) : undefined}
      />
      <Marker
        pane={PANES_RUTA.marcadores.nombre}
        position={aLatLng({ x: elegida.destino[0], y: elegida.destino[1] })}
        icon={destino}
        interactive={false}
        keyboard={false}
        title={nombreDestino ? TEXTOS_RUTA.destinoMapa(nombreDestino) : undefined}
        alt={nombreDestino ? TEXTOS_RUTA.destinoMapa(nombreDestino) : undefined}
      />

      {encuadre && <Encuadrar encuadre={encuadre} margenes={margenes} />}
    </>
  )
}
