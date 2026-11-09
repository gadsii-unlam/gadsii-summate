/**
 * Captura `beforeinstallprompt` y `appinstalled` (decisión 8). Usarlo una vez (App) y pasar el
 * resultado a la ayuda (`OpcionInstalar`) y a `SugerenciaInstalacion`. Al detectar la app
 * instalada pide `navigator.storage.persist()`.
 */
import { useCallback, useEffect, useState } from 'react'
import {
  detectarPlataforma,
  entornoActual,
  pedirAlmacenamientoPersistente,
  type EventoInstalacion,
  type Plataforma,
} from './instalacion.ts'

export interface Instalacion {
  plataforma: Plataforma
  /** Chrome ofreció instalar: se puede mostrar "Instalar en el celular". */
  puedeInstalar: boolean
  /** Abre el diálogo del sistema. Devuelve `true` si el usuario aceptó. */
  instalar: () => Promise<boolean>
}

export function useInstalacion(): Instalacion {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null)
  const [plataforma, setPlataforma] = useState<Plataforma>(() =>
    detectarPlataforma(entornoActual()),
  )

  useEffect(() => {
    const alOfrecer = (e: Event) => {
      e.preventDefault()
      setEvento(e as EventoInstalacion)
    }
    const alInstalar = () => {
      setEvento(null)
      setPlataforma('instalada')
    }
    window.addEventListener('beforeinstallprompt', alOfrecer)
    window.addEventListener('appinstalled', alInstalar)
    return () => {
      window.removeEventListener('beforeinstallprompt', alOfrecer)
      window.removeEventListener('appinstalled', alInstalar)
    }
  }, [])

  useEffect(() => {
    if (plataforma === 'instalada') void pedirAlmacenamientoPersistente()
  }, [plataforma])

  const instalar = useCallback(async () => {
    if (!evento) return false
    await evento.prompt()
    const { outcome } = await evento.userChoice
    setEvento(null)
    return outcome === 'accepted'
  }, [evento])

  return { plataforma, puedeInstalar: evento !== null, instalar }
}
