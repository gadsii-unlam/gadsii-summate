import { useCallback, useState } from 'react'
import { pidePanelDePrueba } from '../../clima/index.ts'
import { usePulsacionLarga, type PropsPulsacionLarga } from './usePulsacionLarga.ts'

export interface PanelPruebaOculto {
  abierto: boolean
  abrir: () => void
  cerrar: () => void
  /** Esparcir en el botón flotante de ayuda: mantenerlo 3 s abre el panel. */
  propsBotonAyuda: PropsPulsacionLarga
}

/**
 * Estado del panel de prueba oculto: arranca abierto con `?panel=prueba` y se abre manteniendo
 * presionado 3 s el botón de ayuda.
 */
export function usePanelPrueba(
  busqueda: string = typeof window === 'undefined' ? '' : window.location.search,
): PanelPruebaOculto {
  const [abierto, setAbierto] = useState(() => pidePanelDePrueba(busqueda))
  const abrir = useCallback(() => setAbierto(true), [])
  const cerrar = useCallback(() => setAbierto(false), [])
  const propsBotonAyuda = usePulsacionLarga(abrir)
  return { abierto, abrir, cerrar, propsBotonAyuda }
}
