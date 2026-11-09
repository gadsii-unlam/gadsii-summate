/**
 * Capa de tramos cerrados sobre el visor (decisión 9), estilo corte de Google Maps: línea roja
 * punteada en cada tramo e ícono de paso prohibido (objetivo táctil de 44 px) que al tocarlo abre
 * una burbuja con el motivo y hasta cuándo. Va en el pane `cierres` (encima del plano, debajo de
 * la ruta). Se monta dentro del `MapContainer` (usa react-leaflet).
 */
import L from 'leaflet'
import { Fragment, useMemo } from 'react'
import { Marker, Polyline, Popup } from 'react-leaflet'
import {
  ESTILO_TRAMO_CERRADO,
  TAMANO_TACTIL_ICONO,
  type TramoCerrado,
} from '../../cierres/index.ts'
import { PANES } from '../mapa/config.ts'
import { aLatLng } from '../mapa/coordenadas.ts'
import { SIN_RECORTE, rendererVectorial } from '../mapa/vectores.ts'
import DetalleCierre from './DetalleCierre.tsx'
import { htmlIconoCierre } from './iconoHtml.ts'
import './cierres.css'

export interface PropsCapaCierres {
  /** `estado.capa` del controlador de cierres (solo los vigentes). */
  tramos: readonly TramoCerrado[]
  /** Pane de Leaflet. Por defecto `cierres` (zIndex 420). */
  pane?: string
  /** Zona horaria IANA para "Cerrado hasta…". Por defecto la del dispositivo. */
  zonaHoraria?: string
}

const OPCIONES_LINEA: L.PathOptions = {
  color: ESTILO_TRAMO_CERRADO.color,
  weight: ESTILO_TRAMO_CERRADO.grosor,
  dashArray: ESTILO_TRAMO_CERRADO.guiones,
  lineCap: 'butt',
  opacity: 1,
  interactive: false,
}

export default function CapaCierres({
  tramos,
  pane = PANES.cierres.nombre,
  zonaHoraria,
}: PropsCapaCierres) {
  const icono = useMemo(
    () =>
      L.divIcon({
        className: 'cierre__icono',
        html: htmlIconoCierre(),
        iconSize: [TAMANO_TACTIL_ICONO, TAMANO_TACTIL_ICONO],
        iconAnchor: [TAMANO_TACTIL_ICONO / 2, TAMANO_TACTIL_ICONO / 2],
        popupAnchor: [0, -TAMANO_TACTIL_ICONO / 2],
      }),
    [],
  )
  const renderer = useMemo(() => rendererVectorial(pane), [pane])
  return (
    <>
      {tramos.map((t) => (
        <Fragment key={t.cierreId}>
          {t.segmentos.map((s, i) => (
            <Polyline
              key={`l${i}`}
              pane={pane}
              renderer={renderer}
              {...SIN_RECORTE}
              positions={s.map(([x, y]) => aLatLng({ x, y }))}
              pathOptions={OPCIONES_LINEA}
            />
          ))}
          {t.iconos.map((ic) => (
            <Marker
              key={`i${ic.elemento}`}
              pane={pane}
              position={aLatLng({ x: ic.posicion[0], y: ic.posicion[1] })}
              icon={icono}
              title={`Tramo cerrado: ${t.motivo}`}
              alt={`Tramo cerrado: ${t.motivo}`}
              keyboard
            >
              <Popup pane="popupPane">
                <DetalleCierre tramo={t} zonaHoraria={zonaHoraria} />
              </Popup>
            </Marker>
          ))}
        </Fragment>
      ))}
    </>
  )
}
