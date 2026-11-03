import { createHash } from 'node:crypto'

/** Hash corto y estable de un contenido (sirve como `version` de los datos generados). */
export function hashCorto(contenido: string | Buffer, largo = 7): string {
  return createHash('sha256').update(contenido).digest('hex').slice(0, largo)
}
