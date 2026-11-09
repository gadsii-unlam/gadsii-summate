/**
 * Único acceso a `localStorage` de la interfaz (design.md, D6). Todo pasa por `try/catch` y hay
 * un respaldo en memoria: en modo privado o con el almacenamiento bloqueado la app funciona igual,
 * solo que no recuerda nada entre sesiones. Las claves llevan versión (`dq:*:v1`).
 */

export const CLAVES = {
  recientes: 'dq:recientes:v1',
  ultimoOrigen: 'dq:ultimo-origen:v1',
  primerUsoCerrado: 'dq:primer-uso-cerrado:v1',
} as const

export type ClaveAlmacen = (typeof CLAVES)[keyof typeof CLAVES]

export interface Almacen {
  /** Lee un valor JSON. Si no existe, no se puede leer o no pasa `validar`, devuelve `null`. */
  leer<T>(clave: ClaveAlmacen, validar: (valor: unknown) => valor is T): T | null
  escribir(clave: ClaveAlmacen, valor: unknown): void
  borrar(clave: ClaveAlmacen): void
}

function storageDelNavegador(): Storage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage
  } catch {
    return null
  }
}

/**
 * Crea un almacén sobre un `Storage` (por defecto `window.localStorage`). Cada escritura queda
 * además en memoria, así que en la misma sesión se lee lo último escrito aunque el
 * almacenamiento falle.
 */
export function crearAlmacen(storage: Storage | null = storageDelNavegador()): Almacen {
  const memoria = new Map<string, string>()

  function crudo(clave: string): string | null {
    if (memoria.has(clave)) return memoria.get(clave) ?? null
    try {
      return storage?.getItem(clave) ?? null
    } catch {
      return null
    }
  }

  return {
    leer<T>(clave: ClaveAlmacen, validar: (valor: unknown) => valor is T): T | null {
      const texto = crudo(clave)
      if (texto === null) return null
      try {
        const valor: unknown = JSON.parse(texto)
        return validar(valor) ? valor : null
      } catch {
        return null
      }
    },
    escribir(clave, valor) {
      let texto: string
      try {
        texto = JSON.stringify(valor)
      } catch {
        return
      }
      memoria.set(clave, texto)
      try {
        storage?.setItem(clave, texto)
      } catch {
        // Lleno o bloqueado: queda solo en memoria.
      }
    },
    borrar(clave) {
      memoria.delete(clave)
      try {
        storage?.removeItem(clave)
      } catch {
        // Nada que hacer.
      }
    },
  }
}

/** Almacén en memoria, para tests. */
export function crearAlmacenEnMemoria(): Almacen {
  return crearAlmacen(null)
}

export function esTexto(valor: unknown): valor is string {
  return typeof valor === 'string'
}

export function esBooleano(valor: unknown): valor is boolean {
  return typeof valor === 'boolean'
}
