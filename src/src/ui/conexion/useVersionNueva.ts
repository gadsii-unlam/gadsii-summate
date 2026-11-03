/// <reference types="vite-plugin-pwa/react" />
/**
 * Registro del service worker y búsqueda de versiones nuevas (decisión 7): al abrir la app, cada
 * 60 minutos con la app abierta (`registration.update()`) y con el evento `online`.
 *
 * Usarlo una sola vez, arriba de todo (App). Cuando algún módulo importa
 * `virtual:pwa-register/react`, el plugin deja de agregar `registerSW.js` a `index.html` y el
 * registro pasa a hacerse acá.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export const INTERVALO_BUSQUEDA_MS = 60 * 60 * 1000

export interface VersionNueva {
  /** Hay una versión nueva instalada y en espera. */
  hayVersionNueva: boolean
  /** Activa la versión en espera; la página se recarga sola cuando toma el control. */
  actualizar: () => void
  /** Cierra el aviso hasta la próxima apertura. */
  postergar: () => void
}

export function useVersionNueva(): VersionNueva {
  const registro = useRef<ServiceWorkerRegistration | null>(null)
  const {
    needRefresh: [hayVersionNueva, setHayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_url, r) {
      registro.current = r ?? null
    },
  })

  useEffect(() => {
    const buscar = () => {
      const r = registro.current
      if (!r || r.installing || (typeof navigator !== 'undefined' && navigator.onLine === false))
        return
      r.update().catch(() => {
        // Sin red: se vuelve a buscar en el próximo intervalo o con `online`.
      })
    }
    const intervalo = setInterval(buscar, INTERVALO_BUSQUEDA_MS)
    window.addEventListener('online', buscar)
    return () => {
      clearInterval(intervalo)
      window.removeEventListener('online', buscar)
    }
  }, [])

  return useMemo(
    () => ({
      hayVersionNueva,
      actualizar: () => {
        // La versión en espera toma el control y la página se recarga una vez (el contexto lo
        // recupera el recorrido guardado). Si la encontró otra pestaña o una carga anterior,
        // `updateServiceWorker` no siempre recarga: se recarga acá con `controllerchange`.
        const sw = typeof navigator === 'undefined' ? undefined : navigator.serviceWorker
        const esperando = registro.current?.waiting
        if (sw && esperando) {
          sw.addEventListener('controllerchange', () => window.location.reload(), { once: true })
          esperando.postMessage({ type: 'SKIP_WAITING' })
        } else {
          void updateServiceWorker(true)
        }
      },
      postergar: () => setHayVersionNueva(false),
    }),
    [hayVersionNueva, updateServiceWorker, setHayVersionNueva],
  )
}
