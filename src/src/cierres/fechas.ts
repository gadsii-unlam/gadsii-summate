/**
 * Fechas de los cierres (decisión 3): ISO 8601 con o sin zona horaria. Con zona (`Z`, `-03:00`)
 * se respeta; sin zona (incluida una fecha sola, `2026-11-05`) se interpreta en la hora local del
 * dispositivo. No se usa `Date.parse` porque interpreta las fechas solas en UTC.
 */

const ISO =
  /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3})\d*)?)?)?\s*(Z|[+-]\d{2}:?\d{2})?$/i

/** Convierte una fecha ISO 8601 a ms desde epoch. Devuelve `null` si no es válida. */
export function parsearFecha(texto: string): number | null {
  const m = ISO.exec(texto.trim())
  if (!m) return null
  const [anio, mes, dia] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const hora = Number(m[4] ?? 0)
  const minuto = Number(m[5] ?? 0)
  const segundo = Number(m[6] ?? 0)
  const ms = Number((m[7] ?? '0').padEnd(3, '0'))
  if (mes < 1 || mes > 12 || dia < 1 || hora > 23 || minuto > 59 || segundo > 59) return null
  // Día válido para el mes (31/02 no existe).
  const diasDelMes = new Date(Date.UTC(anio, mes, 0)).getUTCDate()
  if (dia > diasDelMes) return null

  const zona = m[8]
  if (zona === undefined) {
    return new Date(anio, mes - 1, dia, hora, minuto, segundo, ms).getTime()
  }
  let offsetMin = 0
  if (zona.toUpperCase() !== 'Z') {
    const signo = zona.startsWith('-') ? -1 : 1
    const digitos = zona.slice(1).replace(':', '')
    const oh = Number(digitos.slice(0, 2))
    const om = Number(digitos.slice(2, 4))
    if (oh > 23 || om > 59) return null
    offsetMin = signo * (oh * 60 + om)
  }
  return Date.UTC(anio, mes - 1, dia, hora, minuto, segundo, ms) - offsetMin * 60_000
}

interface PartesFecha {
  dia: string
  mes: string
  hora: string
  minuto: string
}

/**
 * Día, mes, hora y minuto de un instante. `zonaHoraria` (IANA, por ejemplo
 * `America/Argentina/Buenos_Aires`) es opcional: por defecto, la del dispositivo.
 */
function partes(ms: number, zonaHoraria?: string): PartesFecha {
  const formato = new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    ...(zonaHoraria ? { timeZone: zonaHoraria } : {}),
  })
  const valor = (tipo: Intl.DateTimeFormatPartTypes) =>
    (formato.formatToParts(ms).find((p) => p.type === tipo)?.value ?? '0').padStart(2, '0')
  return { dia: valor('day'), mes: valor('month'), hora: valor('hour'), minuto: valor('minute') }
}

/** `05/11 10:00`. */
export function formatearDiaHora(ms: number, zonaHoraria?: string): string {
  const p = partes(ms, zonaHoraria)
  return `${p.dia}/${p.mes} ${p.hora}:${p.minuto}`
}

/** `Cerrado hasta el 14/11 a las 23:00`. */
export function textoCerradoHasta(hasta: number, zonaHoraria?: string): string {
  const p = partes(hasta, zonaHoraria)
  return `Cerrado hasta el ${p.dia}/${p.mes} a las ${p.hora}:${p.minuto}`
}
