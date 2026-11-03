import { useEffect, useState, useSyncExternalStore } from 'react'
import type { RefObject } from 'react'

/** Ancho desde el que la hoja pasa a ser un panel lateral (D2). */
export const ANCHO_ESCRITORIO = 1024

function suscribirConsulta(consulta: string) {
  return (avisar: () => void) => {
    if (typeof window.matchMedia !== 'function') return () => {}
    const mql = window.matchMedia(consulta)
    mql.addEventListener('change', avisar)
    return () => mql.removeEventListener('change', avisar)
  }
}

export function useConsultaMedia(consulta: string): boolean {
  return useSyncExternalStore(suscribirConsulta(consulta), () =>
    typeof window.matchMedia === 'function' ? window.matchMedia(consulta).matches : false,
  )
}

export function useEsEscritorio(): boolean {
  return useConsultaMedia(`(min-width: ${ANCHO_ESCRITORIO}px)`)
}

export function useMovimientoReducido(): boolean {
  return useConsultaMedia('(prefers-reduced-motion: reduce)')
}

function suscribirVentana(avisar: () => void) {
  window.addEventListener('resize', avisar)
  window.visualViewport?.addEventListener('resize', avisar)
  return () => {
    window.removeEventListener('resize', avisar)
    window.visualViewport?.removeEventListener('resize', avisar)
  }
}

/** Alto de la ventana (equivale a `100dvh`). */
export function useAltoVentana(): number {
  return useSyncExternalStore(suscribirVentana, () => window.innerHeight)
}

function suscribirVisible(avisar: () => void) {
  const quitar = suscribirVentana(avisar)
  window.visualViewport?.addEventListener('scroll', avisar)
  return () => {
    quitar()
    window.visualViewport?.removeEventListener('scroll', avisar)
  }
}

/** Alto visible: descuenta el teclado en pantalla (visualViewport). */
export function useAltoVisible(): number {
  return useSyncExternalStore(suscribirVisible, () =>
    Math.round(window.visualViewport?.height ?? window.innerHeight),
  )
}

/** Desplazamiento del viewport visible (Safari corre la página al abrir el teclado). */
export function useArribaVisible(): number {
  return useSyncExternalStore(suscribirVisible, () =>
    Math.round(window.visualViewport?.offsetTop ?? 0),
  )
}

export interface AreasSeguras {
  arriba: number
  abajo: number
}

/** Lee las áreas seguras (`--seguro-*`, que valen `env(safe-area-inset-*)`) con una sonda. */
export function useAreasSeguras(): AreasSeguras {
  const [areas, setAreas] = useState<AreasSeguras>({ arriba: 0, abajo: 0 })
  useEffect(() => {
    const sonda = document.createElement('div')
    sonda.style.cssText =
      'position:fixed;visibility:hidden;pointer-events:none;padding-top:var(--seguro-arriba,0px);padding-bottom:var(--seguro-abajo,0px)'
    document.body.appendChild(sonda)
    const medir = () => {
      const estilo = getComputedStyle(sonda)
      const arriba = parseFloat(estilo.paddingTop) || 0
      const abajo = parseFloat(estilo.paddingBottom) || 0
      setAreas((a) => (a.arriba === arriba && a.abajo === abajo ? a : { arriba, abajo }))
    }
    medir()
    window.addEventListener('resize', medir)
    return () => {
      window.removeEventListener('resize', medir)
      sonda.remove()
    }
  }, [])
  return areas
}

/** Alto de un elemento con `ResizeObserver` (0 si no hay elemento). */
export function useAltoElemento(ref: RefObject<HTMLElement | null>): number {
  const [alto, setAlto] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const medir = () => setAlto(Math.round(el.getBoundingClientRect().height))
    medir()
    if (typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(medir)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return alto
}
