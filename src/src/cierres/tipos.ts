/**
 * Tipos de los cierres temporales (design.md de aplicar-cierres-temporales, decisiones 1 y 5).
 *
 * `ArchivoCierres` es el formato de `public/data/cierres.json` tal como lo escribe el equipo;
 * `Cierre` es un cierre ya validado contra el grafo (ids existentes, aristas normalizadas, fechas
 * convertidas a milisegundos).
 */

/** Un cierre tal como se escribe en `public/data/cierres.json`. */
export interface CierreArchivo {
  /** Obligatorio y único. */
  id: string
  /** Texto corto en términos del campus; se muestra tal cual al usuario. */
  motivo: string
  /** Ids de nodos de `grafo.json` (`entrada-ed-sur-norte`, `pasillo-frente-aula-121`…). */
  nodos?: string[]
  /** Ids de aristas (`arista__<a>__<b>`), en cualquier sentido. */
  aristas?: string[]
  /** ISO 8601, inclusivo. Sin `desde`, vigente desde siempre. */
  desde?: string
  /** ISO 8601, exclusivo. Sin `hasta`, vigente hasta que se saque del archivo. */
  hasta?: string
}

/** Formato de `public/data/cierres.json`. */
export interface ArchivoCierres {
  version: 1
  /** Fecha de la última precarga (informativa). */
  actualizado?: string
  cierres: CierreArchivo[]
}

/** Un cierre validado contra el grafo. */
export interface Cierre {
  readonly id: string
  /** Motivo del archivo, o "Cerrado temporalmente" si faltaba. */
  readonly motivo: string
  /** Ids de nodos existentes en el grafo (sin repetidos). */
  readonly nodos: readonly string[]
  /** Ids de aristas existentes, normalizados al id del grafo (sin repetidos). */
  readonly aristas: readonly string[]
  /** Inicio en ms desde epoch (inclusivo); `null` = desde siempre. */
  readonly desde: number | null
  /** Fin en ms desde epoch (exclusivo); `null` = sin fin. */
  readonly hasta: number | null
  /**
   * `true` si alguna fecha es inválida o `hasta` no es posterior a `desde`: el cierre se
   * considera vigente siempre (preferimos evitar un tramo de más a mandar a alguien por uno cerrado).
   */
  readonly siempreVigente: boolean
}

export type CodigoProblema =
  /** El archivo no es un objeto con `version: 1` y una lista `cierres`. */
  | 'forma-invalida'
  /** Un elemento de `cierres` no es un objeto, o `nodos`/`aristas` no son listas. */
  | 'cierre-invalido'
  | 'sin-id'
  | 'id-duplicado'
  | 'sin-motivo'
  /** Un nodo o arista que no existe en el grafo. */
  | 'id-desconocido'
  /** El cierre no tiene ningún nodo ni arista válido: se descarta. */
  | 'sin-tramos'
  | 'fecha-invalida'
  | 'hasta-no-posterior'

export interface ProblemaCierres {
  codigo: CodigoProblema
  /** Id del cierre afectado (`null` si el problema es del archivo entero). */
  cierre: string | null
  /** Texto para la consola o el script de validación. */
  mensaje: string
}

export interface ResultadoValidacion {
  /** `false` si el archivo entero no tiene la forma esperada (no se pudo leer ningún cierre). */
  formaValida: boolean
  /** Cierres que se aplican (modo tolerante: se descartan solo los que no cierran nada). */
  cierres: Cierre[]
  /** Todo lo que el modo estricto (CI) considera error. */
  problemas: ProblemaCierres[]
}
