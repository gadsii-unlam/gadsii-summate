/**
 * Capa de la ruta conectada (`Integraciones.CapasMapa`, junto con la de cierres): lee la ruta
 * elegida, la alternativa y el paso tocado de `VistaRuta`, y los márgenes de la pantalla para
 * encuadrar. Se carga con `React.lazy` (usa Leaflet). Fuera de un `MapContainer` no dibuja nada.
 */
import { LeafletContext } from '@react-leaflet/core'
import { useContext, useEffect, useMemo } from 'react'
import { useLugar } from '../catalogo.ts'
import { useVistaPantalla } from '../estado/vistaPantalla.ts'
import CapaRuta from './CapaRuta.tsx'
import { useDatosIndicaciones, useEstadoVistaRuta, useVistaRuta } from './conexion.ts'
import { cajaDePuntos, geometriaRuta, puntosDePaso, puntosIniciales } from './geometria.ts'
import LeyendaRuta from './LeyendaRuta.tsx'

export default function CapaRutaMapa() {
  const leaflet = useContext(LeafletContext)
  const datos = useDatosIndicaciones()
  const vista = useVistaRuta()
  const estado = useEstadoVistaRuta()
  const pantalla = useVistaPantalla()
  const [origenId, destinoId] = (estado.clave ?? '|').split('|')
  const origen = useLugar(origenId || null)
  const destino = useLugar(destinoId || null)

  const seleccion = estado.seleccion
  const geo = useMemo(
    () => (seleccion && datos ? geometriaRuta(seleccion.elegida, datos) : null),
    [seleccion, datos],
  )
  const resaltado = useMemo(
    () => (geo && estado.paso ? puntosDePaso(geo, estado.paso) : null),
    [geo, estado.paso],
  )
  const encuadre = useMemo(() => {
    if (!geo || !estado.encuadre) return null
    const { objetivo } = estado.encuadre
    const puntos =
      objetivo === 'paso' && resaltado
        ? resaltado
        : objetivo === 'inicio'
          ? puntosIniciales(geo.polilinea)
          : geo.polilinea
    const caja = cajaDePuntos(puntos)
    return caja ? { caja, clave: estado.encuadre.n } : null
  }, [geo, resaltado, estado.encuadre])

  // La ruta dibujada, a la vista en el DOM del mapa (más simple que leer las líneas del SVG):
  // la usan las pruebas e2e, como el zoom y el centro que publica el visor.
  const mapaLeaflet = leaflet?.map ?? null
  const nodos = seleccion?.elegida.nodos.join(' ') ?? ''
  const partes = geo?.partes.map((p) => (p.exterior ? 'aire-libre' : 'bajo-techo')).join(' ') ?? ''
  const alternativaNodos = seleccion?.alternativa?.nodos.join(' ') ?? ''
  const pasoResaltado = estado.paso ? `${estado.paso.tramo.desde}-${estado.paso.tramo.hasta}` : ''
  useEffect(() => {
    if (!mapaLeaflet) return
    const d = mapaLeaflet.getContainer().dataset
    d.rutaNodos = nodos
    d.rutaPartes = partes
    d.rutaAlternativa = alternativaNodos
    d.rutaResaltado = pasoResaltado
    return () => {
      delete d.rutaNodos
      delete d.rutaPartes
      delete d.rutaAlternativa
      delete d.rutaResaltado
    }
  }, [mapaLeaflet, nodos, partes, alternativaNodos, pasoResaltado])

  if (!leaflet || !geo || !seleccion) return null
  const { plan } = estado
  const alternativa = seleccion.alternativa
  return (
    <>
      <CapaRuta
        elegida={geo}
        alternativa={alternativa?.polilinea ?? null}
        {...(alternativa && plan && vista
          ? { alTocarAlternativa: () => vista.elegir(plan, alternativa.criterio) }
          : {})}
        resaltado={resaltado}
        salaDestino={destino?.sala ?? null}
        nombreOrigen={origen?.nombre ?? ''}
        nombreDestino={destino?.nombre ?? ''}
        encuadre={encuadre}
        {...(pantalla ? { margenes: pantalla.margenes } : {})}
      />
      <LeyendaRuta
        tieneAireLibre={geo.tieneAireLibre}
        arriba={(pantalla?.margenes.arriba ?? 0) + 12}
      />
    </>
  )
}
