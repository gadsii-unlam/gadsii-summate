/**
 * De dónde salieron los cierres usados (design.md de tolerar-senal-irregular, decisión 3):
 * - `red`: respuesta del servidor.
 * - `cache`: la última copia que guardó el service worker (la red falló o tardó más de 4 s).
 *   El service worker la marca con `X-DQ-Origen: cache` y `X-DQ-Guardado-En` (ver
 *   `scripts/pwa/opciones.ts`).
 * - `respaldo`: la copia incluida en el bundle al compilar (`fuente: 'incluida'` de
 *   `cargarCierres`), con su fecha `actualizado`.
 *
 * Si los cierres no vienen de la red, la app muestra "Cierres sin actualizar desde las HH:MM".
 */

export const CABECERA_ORIGEN = 'X-DQ-Origen'
export const CABECERA_GUARDADO_EN = 'X-DQ-Guardado-En'

export interface CabecerasMinimas {
  get(nombre: string): string | null
}

export type OrigenDatos =
  | { origen: 'red' }
  | { origen: 'cache'; guardadoEn: string | null }
  | { origen: 'respaldo'; guardadoEn: string | null }

/** Lee las marcas del service worker en una respuesta de `/data/cierres.json`. */
export function origenDeRespuesta(cabeceras: CabecerasMinimas): OrigenDatos {
  if (cabeceras.get(CABECERA_ORIGEN) !== 'cache') return { origen: 'red' }
  const guardadoEn = cabeceras.get(CABECERA_GUARDADO_EN) ?? cabeceras.get('Date')
  return { origen: 'cache', guardadoEn: normalizarFecha(guardadoEn) }
}

/** Origen de la copia incluida en el bundle, con la fecha `actualizado` del archivo. */
export function origenRespaldo(actualizado: unknown): OrigenDatos {
  return {
    origen: 'respaldo',
    guardadoEn: normalizarFecha(typeof actualizado === 'string' ? actualizado : null),
  }
}

function normalizarFecha(texto: string | null): string | null {
  if (!texto) return null
  const ms = Date.parse(texto)
  return Number.isNaN(ms) ? null : new Date(ms).toISOString()
}

/** `HH:MM` en 24 horas, en la zona horaria del dispositivo (o la indicada, para tests). */
export function horaCorta(iso: string, zonaHoraria?: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(zonaHoraria ? { timeZone: zonaHoraria } : {}),
  }).format(new Date(iso))
}

/**
 * Texto del aviso, o `null` si los cierres vienen de la red. Sin hora conocida, el aviso dice
 * solo que pueden no estar actualizados.
 */
export function textoCierresSinActualizar(
  origen: OrigenDatos | null | undefined,
  zonaHoraria?: string,
): string | null {
  if (!origen || origen.origen === 'red') return null
  if (!origen.guardadoEn) return 'Cierres sin actualizar'
  return `Cierres sin actualizar desde las ${horaCorta(origen.guardadoEn, zonaHoraria)}`
}
