/**
 * Instalación opcional (design.md, decisión 8).
 * - Android / Chrome: se guarda el evento `beforeinstallprompt` y se ofrece "Instalar en el
 *   celular" en la ayuda. Como mucho una vez, una sugerencia chica después de terminar el segundo
 *   recorrido con "Finalizar viaje"; nunca en el primer uso ni con una ruta en pantalla.
 * - iOS / Safari: no hay evento; la ayuda muestra los pasos "Compartir → Agregar a inicio".
 * - Instalada: se pide `navigator.storage.persist()` para que no se borre la caché.
 *
 * El contador va en `localStorage` (`dq:instalacion:v1`), con `try/catch` en todo acceso.
 */

export const CLAVE_INSTALACION = 'dq:instalacion:v1'
export const RECORRIDOS_PARA_SUGERIR = 2

export type Plataforma = 'instalada' | 'ios' | 'otra'

/** El evento de Chrome (no está en los tipos del DOM). */
export interface EventoInstalacion extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface EntornoNavegador {
  userAgent: string
  /** `navigator.maxTouchPoints` (el iPad con iPadOS se presenta como Mac). */
  maxTouchPoints?: number
  /** `navigator.standalone` de Safari para iOS. */
  standalone?: boolean
  /** `matchMedia('(display-mode: standalone)').matches`. */
  modoStandalone?: boolean
}

export function entornoActual(): EntornoNavegador {
  if (typeof navigator === 'undefined') return { userAgent: '' }
  const n = navigator as Navigator & { standalone?: boolean }
  let modoStandalone = false
  try {
    modoStandalone =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches
  } catch {
    modoStandalone = false
  }
  return {
    userAgent: n.userAgent,
    maxTouchPoints: n.maxTouchPoints,
    ...(n.standalone !== undefined ? { standalone: n.standalone } : {}),
    modoStandalone,
  }
}

export function detectarPlataforma(e: EntornoNavegador): Plataforma {
  if (e.modoStandalone || e.standalone) return 'instalada'
  const ua = e.userAgent
  const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && (e.maxTouchPoints ?? 0) > 1)
  return ios ? 'ios' : 'otra'
}

interface RegistroInstalacion {
  recorridosTerminados: number
  sugerenciaMostrada: boolean
}

type Almacenamiento = Pick<Storage, 'getItem' | 'setItem'>

function storagePorDefecto(): Almacenamiento | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

export function leerRegistro(storage = storagePorDefecto()): RegistroInstalacion {
  const vacio = { recorridosTerminados: 0, sugerenciaMostrada: false }
  try {
    const v = JSON.parse(storage?.getItem(CLAVE_INSTALACION) ?? 'null') as unknown
    if (typeof v !== 'object' || v === null) return vacio
    const r = v as Record<string, unknown>
    return {
      recorridosTerminados: typeof r.recorridosTerminados === 'number' ? r.recorridosTerminados : 0,
      sugerenciaMostrada: r.sugerenciaMostrada === true,
    }
  } catch {
    return vacio
  }
}

function escribirRegistro(r: RegistroInstalacion, storage = storagePorDefecto()) {
  try {
    storage?.setItem(CLAVE_INSTALACION, JSON.stringify(r))
  } catch {
    // Sin almacenamiento: la sugerencia no aparece (nunca se llega a dos recorridos guardados).
  }
}

/** Llamar con "Finalizar viaje". Devuelve el registro actualizado. */
export function contarRecorridoTerminado(storage = storagePorDefecto()): RegistroInstalacion {
  const r = leerRegistro(storage)
  const nuevo = { ...r, recorridosTerminados: r.recorridosTerminados + 1 }
  escribirRegistro(nuevo, storage)
  return nuevo
}

export function marcarSugerenciaMostrada(storage = storagePorDefecto()): void {
  escribirRegistro({ ...leerRegistro(storage), sugerenciaMostrada: true }, storage)
}

export interface CondicionesSugerencia {
  /** Chrome ofreció instalar (`beforeinstallprompt`). */
  puedeInstalar: boolean
  hayRutaEnPantalla: boolean
  registro: RegistroInstalacion
}

/** Una sola vez, después del segundo recorrido terminado, sin ruta en pantalla. */
export function debeSugerirInstalacion(c: CondicionesSugerencia): boolean {
  return (
    c.puedeInstalar &&
    !c.hayRutaEnPantalla &&
    !c.registro.sugerenciaMostrada &&
    c.registro.recorridosTerminados >= RECORRIDOS_PARA_SUGERIR
  )
}

/** Pide almacenamiento persistente (clave en iOS). Nunca rechaza. */
export async function pedirAlmacenamientoPersistente(
  storageManager: Pick<StorageManager, 'persist' | 'persisted'> | undefined = typeof navigator ===
  'undefined'
    ? undefined
    : navigator.storage,
): Promise<boolean> {
  try {
    if (!storageManager?.persist) return false
    if (await storageManager.persisted?.()) return true
    return await storageManager.persist()
  } catch {
    return false
  }
}
