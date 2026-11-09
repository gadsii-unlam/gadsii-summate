import { useCallback, useEffect, useRef } from 'react'
import type { MouseEvent, PointerEvent } from 'react'

/** Duración del gesto oculto sobre el botón de ayuda (design.md de adaptar-ruta-al-clima, D3). */
export const DURACION_PULSACION_LARGA_MS = 3000

export interface PropsPulsacionLarga {
  onPointerDown: (e: PointerEvent<HTMLElement>) => void
  onPointerUp: () => void
  onPointerLeave: () => void
  onPointerCancel: () => void
  /** Evita el menú contextual del toque largo en Android. */
  onContextMenu: (e: MouseEvent<HTMLElement>) => void
  /** Si la pulsación larga se disparó, se come el clic que la sigue (no abre la ayuda). */
  onClickCapture: (e: MouseEvent<HTMLElement>) => void
}

/**
 * Props para esparcir en un botón: al mantenerlo presionado `ms` dispara `alPulsarLargo`. Un toque
 * corto no hace nada (el `onClick` del botón sigue funcionando normalmente).
 */
export function usePulsacionLarga(
  alPulsarLargo: () => void,
  ms: number = DURACION_PULSACION_LARGA_MS,
): PropsPulsacionLarga {
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null)
  const disparada = useRef(false)
  const accion = useRef(alPulsarLargo)

  useEffect(() => {
    accion.current = alPulsarLargo
  }, [alPulsarLargo])

  const cortar = useCallback(() => {
    if (temporizador.current !== null) clearTimeout(temporizador.current)
    temporizador.current = null
  }, [])

  useEffect(() => cortar, [cortar])

  return {
    onPointerDown: useCallback(
      (e: PointerEvent<HTMLElement>) => {
        if (e.button !== 0) return
        cortar()
        disparada.current = false
        temporizador.current = setTimeout(() => {
          temporizador.current = null
          disparada.current = true
          accion.current()
        }, ms)
      },
      [cortar, ms],
    ),
    onPointerUp: cortar,
    onPointerLeave: cortar,
    onPointerCancel: cortar,
    onContextMenu: useCallback((e: MouseEvent<HTMLElement>) => {
      if (temporizador.current !== null || disparada.current) e.preventDefault()
    }, []),
    onClickCapture: useCallback((e: MouseEvent<HTMLElement>) => {
      if (!disparada.current) return
      disparada.current = false
      e.preventDefault()
      e.stopPropagation()
    }, []),
  }
}
