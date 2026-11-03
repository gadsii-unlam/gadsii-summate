import { useEffect, useRef, useState } from 'react'

/** "Buscando el camino…" aparece si la espera supera esto (sin parpadeo con caché). */
export const DEMORA_ESPERA_MS = 150
/** Una vez visible, queda al menos esto. */
export const MINIMO_ESPERA_MS = 400

/**
 * `true` mientras hay que mostrar el indicador de espera: aparece si `buscando` dura más de
 * `demora` y, una vez visible, sigue al menos `minimo` aunque la respuesta ya haya llegado.
 */
export function useEsperaVisible(
  buscando: boolean,
  demora = DEMORA_ESPERA_MS,
  minimo = MINIMO_ESPERA_MS,
): boolean {
  const [visible, setVisible] = useState(false)
  const desde = useRef(0)

  useEffect(() => {
    if (buscando && !visible) {
      const t = setTimeout(() => {
        desde.current = Date.now()
        setVisible(true)
      }, demora)
      return () => clearTimeout(t)
    }
    if (!buscando && visible) {
      const resto = Math.max(0, minimo - (Date.now() - desde.current))
      const t = setTimeout(() => setVisible(false), resto)
      return () => clearTimeout(t)
    }
    return undefined
  }, [buscando, visible, demora, minimo])

  return visible
}
