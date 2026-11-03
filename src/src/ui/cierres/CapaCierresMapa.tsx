/**
 * Capa de cierres conectada al controlador (`ContextoCierres`), para `Integraciones.CapasMapa`.
 * Se carga con `React.lazy` (usa Leaflet). Fuera de un `MapContainer` (el doble del mapa en
 * jsdom) no dibuja nada.
 */
import { LeafletContext } from '@react-leaflet/core'
import { useContext } from 'react'
import CapaCierres from './CapaCierres.tsx'
import { useEstadoCierresActual } from './contexto.ts'

export default function CapaCierresMapa() {
  const leaflet = useContext(LeafletContext)
  const estado = useEstadoCierresActual()
  if (!leaflet || !estado || estado.capa.length === 0) return null
  return <CapaCierres tramos={estado.capa} />
}
