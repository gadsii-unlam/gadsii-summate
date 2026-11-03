/** Problemas que encuentra el pipeline. Los errores frenan el build; los avisos y la info no. */
export type Severidad = 'error' | 'aviso' | 'info'

export interface Problema {
  severidad: Severidad
  /** Clave corta del chequeo (por ejemplo `grafo-no-conexo`), para agrupar en el reporte. */
  tipo: string
  mensaje: string
  /** Ids de nodos, aristas o lugares involucrados. */
  ids?: string[]
}

export const error = (tipo: string, mensaje: string, ids?: string[]): Problema => ({
  severidad: 'error',
  tipo,
  mensaje,
  ...(ids ? { ids } : {}),
})

export const aviso = (tipo: string, mensaje: string, ids?: string[]): Problema => ({
  severidad: 'aviso',
  tipo,
  mensaje,
  ...(ids ? { ids } : {}),
})

export const info = (tipo: string, mensaje: string, ids?: string[]): Problema => ({
  severidad: 'info',
  tipo,
  mensaje,
  ...(ids ? { ids } : {}),
})

export const errores = (problemas: readonly Problema[]): Problema[] =>
  problemas.filter((p) => p.severidad === 'error')

/** Error con todos los problemas juntos, para corregirlos de una vez. */
export class ErrorDatos extends Error {
  readonly problemas: Problema[]

  constructor(problemas: Problema[]) {
    super(
      `Los datos del campus no validan (${problemas.length} problema(s)):\n` +
        problemas.map((p) => `  - [${p.tipo}] ${p.mensaje}`).join('\n'),
    )
    this.name = 'ErrorDatos'
    this.problemas = problemas
  }
}

/** Lanza `ErrorDatos` si hay algún error en la lista. */
export function frenarSiHayErrores(problemas: readonly Problema[]): void {
  const graves = errores(problemas)
  if (graves.length > 0) throw new ErrorDatos(graves)
}
