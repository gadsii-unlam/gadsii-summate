/**
 * Fecha simulada para verificar cierres (decisión 3): `?ahora=2026-11-05T10:00-03:00` reemplaza
 * el reloj del dispositivo y queda guardada en `sessionStorage` para el resto de la pestaña.
 * `?ahora=` (vacío) o `?ahora=real` la desactiva. Mientras esté activa la interfaz muestra
 * "Fecha simulada: 05/11 10:00" (`textoFechaSimulada`).
 */
import { formatearDiaHora, parsearFecha } from './fechas.ts'

export const PARAMETRO_FECHA_SIMULADA = 'ahora'
export const CLAVE_FECHA_SIMULADA = 'dq:ahora-simulado:v1'

type AlmacenSesion = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export interface OpcionesFechaSimulada {
  /** Query string (`?ahora=…`). Por defecto `window.location.search`. */
  search?: string
  /** Por defecto `window.sessionStorage` (o nada si no está disponible). */
  storage?: AlmacenSesion | null
  advertir?: (mensaje: string) => void
}

function sessionStorageDelNavegador(): AlmacenSesion | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

/**
 * `URLSearchParams` convierte `+` en espacio, así que `?ahora=2026-11-05T10:00+01:00` llega como
 * `… 01:00`; se repara antes de parsear.
 */
function repararMas(texto: string): string {
  return texto.replace(/ (\d{2}:?\d{2})$/, '+$1')
}

/**
 * Lee la fecha simulada (ms desde epoch) o `null` si no hay. El parámetro de la URL tiene
 * prioridad y se guarda en la sesión; un valor inválido se ignora con advertencia.
 */
export function leerFechaSimulada(opciones: OpcionesFechaSimulada = {}): number | null {
  const search = opciones.search ?? (typeof window === 'undefined' ? '' : window.location.search)
  const storage = 'storage' in opciones ? opciones.storage : sessionStorageDelNavegador()
  const advertir = opciones.advertir ?? ((m: string) => console.warn(m))
  const parametros = new URLSearchParams(search)

  if (parametros.has(PARAMETRO_FECHA_SIMULADA)) {
    const valor = repararMas((parametros.get(PARAMETRO_FECHA_SIMULADA) ?? '').trim())
    if (valor === '' || valor.toLowerCase() === 'real') {
      try {
        storage?.removeItem(CLAVE_FECHA_SIMULADA)
      } catch {
        // Sin almacenamiento: no hay nada guardado.
      }
      return null
    }
    const ms = parsearFecha(valor)
    if (ms === null) {
      advertir(`[cierres] fecha simulada inválida: ${valor}; se usa el reloj del dispositivo`)
      return null
    }
    try {
      storage?.setItem(CLAVE_FECHA_SIMULADA, valor)
    } catch {
      // Lleno o bloqueado: vale solo para esta carga.
    }
    return ms
  }

  let guardado: string | null = null
  try {
    guardado = storage?.getItem(CLAVE_FECHA_SIMULADA) ?? null
  } catch {
    guardado = null
  }
  return guardado === null ? null : parsearFecha(guardado)
}

/** `Fecha simulada: 05/11 10:00`. */
export function textoFechaSimulada(ms: number, zonaHoraria?: string): string {
  return `Fecha simulada: ${formatearDiaHora(ms, zonaHoraria)}`
}

/** Reloj de la app: la fecha simulada fija, o `Date.now`. */
export function crearReloj(fechaSimulada: number | null): () => number {
  return fechaSimulada === null ? () => Date.now() : () => fechaSimulada
}
