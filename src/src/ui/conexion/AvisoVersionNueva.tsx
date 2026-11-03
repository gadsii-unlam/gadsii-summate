/**
 * "Hay una versión nueva" con "Actualizar" y "Más tarde" (decisión 7). Solo aparece sin un
 * recorrido en pantalla: durante un recorrido no se muestra ni se recarga nada, y aparece
 * después de "Finalizar viaje". "Más tarde" la cierra hasta la próxima apertura.
 */
import { useState } from 'react'
import { TEXTOS_CONEXION as T } from './textos.ts'
import './conexion.css'

export interface PropsAvisoVersionNueva {
  /** Hay un service worker nuevo instalado y en espera (`needRefresh` de `useRegisterSW`). */
  hayVersionNueva: boolean
  /** Hay una ruta en pantalla (recorrido en curso). */
  recorridoEnPantalla: boolean
  /** Activa la versión en espera y recarga (`updateServiceWorker(true)`). */
  onActualizar: () => void
  onMasTarde?: () => void
}

export default function AvisoVersionNueva({
  hayVersionNueva,
  recorridoEnPantalla,
  onActualizar,
  onMasTarde,
}: PropsAvisoVersionNueva) {
  const [postergada, setPostergada] = useState(false)
  const [actualizando, setActualizando] = useState(false)
  if (!hayVersionNueva || recorridoEnPantalla || postergada) return null
  return (
    <div className="aviso-version">
      <p role="status" className="aviso-version__texto">
        {T.versionNueva}
      </p>
      <div className="aviso-version__acciones">
        <button
          type="button"
          className="boton boton--secundario"
          onClick={() => {
            setPostergada(true)
            onMasTarde?.()
          }}
        >
          {T.masTarde}
        </button>
        <button
          type="button"
          className="boton boton--primario"
          disabled={actualizando}
          onClick={() => {
            setActualizando(true)
            onActualizar()
          }}
        >
          {T.actualizar}
        </button>
      </div>
    </div>
  )
}
