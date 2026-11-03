/**
 * `Integraciones.Avisos` de la app: la pila de avisos flotantes arriba de la hoja inferior
 * ("Sin conexión" con "Reintentar", cierres sin actualizar, cambios en la ruta, versión nueva,
 * sugerencia de instalación y recorrido no recuperado). No tapa la tarjeta de arriba ni la hoja.
 */
import type { CSSProperties } from 'react'
import { useSyncExternalStore } from 'react'
import type { EstadoConexion, MonitorConexion } from '../../conexion/index.ts'
import type { PropsAvisos } from '../integraciones.ts'
import { AvisoCambiosRuta, AvisoRutaActualizada } from './AvisoCambiosRuta.tsx'
import AvisoCierresSinActualizar from './AvisoCierresSinActualizar.tsx'
import AvisoVersionNueva from './AvisoVersionNueva.tsx'
import BarraSinConexion from './BarraSinConexion.tsx'
import { useEstadoCoordinador, useValorConexion } from './contexto.ts'
import { SEPARACION_BARRA } from './posicion.ts'
import SugerenciaInstalacion from './SugerenciaInstalacion.tsx'
import './conexion.css'

const sinSuscripcion = () => () => {}
const enLinea = (): EstadoConexion => 'en-linea'

function useEstadoMonitor(monitor: MonitorConexion | null): EstadoConexion {
  return useSyncExternalStore(
    monitor ? (avisar) => monitor.suscribir(avisar) : sinSuscripcion,
    monitor ? () => monitor.estado : enLinea,
    monitor ? () => monitor.estado : enLinea,
  )
}

export default function AvisosApp({
  altoVentana,
  altoHoja,
  bordeTarjeta,
  escritorio,
}: PropsAvisos) {
  const valor = useValorConexion()
  const conexion = useEstadoMonitor(valor?.monitor ?? null)
  const coordinado = useEstadoCoordinador(valor?.coordinador ?? null)
  if (!valor) return null

  const sinConexion = conexion === 'sin-conexion'
  const { coordinador, version, sugerenciaInstalacion, instalacion, hayRutaEnPantalla } = valor
  // La pila crece hacia arriba desde el borde de la hoja; nunca por encima de la tarjeta.
  const estilo = {
    '--pila-abajo': `${altoHoja + SEPARACION_BARRA}px`,
    '--pila-maximo': `${Math.max(0, altoVentana - altoHoja - bordeTarjeta - 2 * SEPARACION_BARRA)}px`,
  } as CSSProperties

  return (
    <div className="pila-avisos" data-escritorio={escritorio || undefined} style={estilo}>
      {valor.mensajeRecorrido && (
        <p className="aviso-ruta aviso-ruta__texto" role="status">
          {valor.mensajeRecorrido}
        </p>
      )}
      <SugerenciaInstalacion
        visible={sugerenciaInstalacion.visible && !hayRutaEnPantalla}
        onInstalar={() => {
          sugerenciaInstalacion.cerrar()
          void instalacion.instalar()
        }}
        onCerrar={sugerenciaInstalacion.cerrar}
      />
      <AvisoVersionNueva
        hayVersionNueva={version.hayVersionNueva}
        recorridoEnPantalla={hayRutaEnPantalla}
        onActualizar={version.actualizar}
        onMasTarde={version.postergar}
      />
      {hayRutaEnPantalla && coordinado.cambio && (
        <AvisoCambiosRuta
          cambio={coordinado.cambio}
          onVerRuta={() => coordinador.verRutaActualizada()}
        />
      )}
      <AvisoRutaActualizada visible={hayRutaEnPantalla && coordinado.rutaActualizada} />
      {!sinConexion && hayRutaEnPantalla && (
        <AvisoCierresSinActualizar origen={coordinado.origenCierres} />
      )}
      <BarraSinConexion
        visible={sinConexion}
        reintentando={coordinado.reintentando}
        onReintentar={() => void coordinador.reintentar()}
        origenCierres={coordinado.origenCierres}
      />
    </div>
  )
}
