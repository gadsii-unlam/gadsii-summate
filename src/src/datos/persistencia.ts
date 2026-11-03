/**
 * Recorrido guardado en el dispositivo (design.md de tolerar-senal-irregular, decisión 6).
 *
 * Guarda en `localStorage` (clave `dq:recorrido:v1`) el origen, el destino, la alternativa
 * mostrada y las rutas del recorrido en curso, para restaurarlos al recargar o reabrir la app
 * dentro de las 2 horas. Todo acceso al almacenamiento va en `try/catch`: si `localStorage` no
 * existe o lanza (navegación privada, cuota llena), la app funciona igual sin restaurar.
 *
 * Es lógica pura y sincrónica (sin React): se lee antes del primer render.
 */

export const CLAVE_RECORRIDO = 'dq:recorrido:v1'

/** Vigencia del recorrido guardado desde `guardadoEn` (Open Questions: es una constante). */
export const VIGENCIA_RECORRIDO_MS = 2 * 60 * 60 * 1000

export const MENSAJE_RECORRIDO_PERDIDO = 'No pudimos recuperar tu recorrido anterior'

export type CriterioRecorrido = 'mas-corta' | 'resguardada'
export type ClimaUsado = 'seco' | 'lluvia' | 'error'

export interface RutaGuardada {
  criterio: string
  /** Ids de nodo del grafo, en orden. */
  nodos: string[]
}

export interface RecorridoGuardado {
  esquema: 1
  /** `versionDatos(grafo, catalogo)` con la que se calcularon las rutas. */
  versionDatos: string
  /** Id de lugar del catálogo, solo si está confirmado (nunca la sugerencia sin confirmar). */
  origen?: string
  destino?: string
  /** Si el usuario eligió el criterio (por ejemplo, con el clima en error). */
  criterioElegido?: CriterioRecorrido
  alternativaMostrada: CriterioRecorrido
  /** Las rutas que se estaban mostrando (vacío si todavía no hay ruta). */
  rutas: RutaGuardada[]
  climaUsado: ClimaUsado
  /** ISO 8601. */
  guardadoEn: string
}

/** Lo que pasa la app al guardar: `esquema` y `guardadoEn` los completa `guardarRecorrido`. */
export type RecorridoAGuardar = Omit<RecorridoGuardado, 'esquema' | 'guardadoEn'>

/** Lo que se usa de `Storage` (sin depender de los tipos del DOM: lo importan también scripts). */
export interface AlmacenamientoClaveValor {
  getItem(clave: string): string | null
  setItem(clave: string, valor: string): void
  removeItem(clave: string): void
}

export interface OpcionesPersistencia {
  /** Por defecto `localStorage` (o ninguno si no se puede acceder). */
  storage?: AlmacenamientoClaveValor | null
  /** Reloj (para tests). */
  ahora?: () => Date
}

/**
 * Versión de los datos del campus que usa un recorrido: combina el hash del grafo y el del
 * catálogo (que a su vez incluye el del grafo). Cambiar un nodo de `grafo.json` cambia
 * `grafo.version` en el pipeline y, con eso, esta versión.
 */
export function versionDatos(
  grafo: { readonly version: string },
  catalogo: { readonly version: string },
): string {
  return `${grafo.version}.${catalogo.version}`
}

function storagePorDefecto(): OpcionesPersistencia['storage'] {
  try {
    // Leer `localStorage` puede lanzar (por ejemplo, con las cookies bloqueadas).
    return (globalThis as { localStorage?: AlmacenamientoClaveValor }).localStorage ?? null
  } catch {
    return null
  }
}

function storageDe(opciones: OpcionesPersistencia): OpcionesPersistencia['storage'] {
  return 'storage' in opciones ? opciones.storage : storagePorDefecto()
}

const CRITERIOS: readonly string[] = ['mas-corta', 'resguardada']
const CLIMAS: readonly string[] = ['seco', 'lluvia', 'error']

const esTextoOpcional = (v: unknown) => v === undefined || typeof v === 'string'

function esRuta(v: unknown): v is RutaGuardada {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    typeof r.criterio === 'string' &&
    Array.isArray(r.nodos) &&
    r.nodos.every((n) => typeof n === 'string')
  )
}

/** Valida la forma completa del esquema 1. Cualquier otra cosa se descarta. */
export function esRecorridoGuardado(v: unknown): v is RecorridoGuardado {
  if (typeof v !== 'object' || v === null) return false
  const r = v as Record<string, unknown>
  return (
    r.esquema === 1 &&
    typeof r.versionDatos === 'string' &&
    esTextoOpcional(r.origen) &&
    esTextoOpcional(r.destino) &&
    (r.criterioElegido === undefined || CRITERIOS.includes(r.criterioElegido as string)) &&
    CRITERIOS.includes(r.alternativaMostrada as string) &&
    Array.isArray(r.rutas) &&
    r.rutas.every(esRuta) &&
    CLIMAS.includes(r.climaUsado as string) &&
    typeof r.guardadoEn === 'string' &&
    !Number.isNaN(Date.parse(r.guardadoEn))
  )
}

/**
 * Escribe el recorrido. Se llama al elegir el destino o confirmar el origen, al mostrar una ruta
 * y al cambiar de alternativa. Devuelve `false` si no se pudo guardar (sin lanzar nunca).
 */
export function guardarRecorrido(
  recorrido: RecorridoAGuardar,
  opciones: OpcionesPersistencia = {},
): boolean {
  const ahora = opciones.ahora ?? (() => new Date())
  const valor: RecorridoGuardado = {
    ...recorrido,
    esquema: 1,
    guardadoEn: ahora().toISOString(),
  }
  try {
    const storage = storageDe(opciones)
    if (!storage) return false
    storage.setItem(CLAVE_RECORRIDO, JSON.stringify(valor))
    return true
  } catch {
    return false
  }
}

/** Borra el recorrido ("Finalizar viaje" o vencido). Nunca lanza. */
export function borrarRecorrido(opciones: OpcionesPersistencia = {}): void {
  try {
    storageDe(opciones)?.removeItem(CLAVE_RECORRIDO)
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

/**
 * Lee el recorrido guardado si existe, tiene el esquema 1 y no venció. Un JSON roto, un esquema
 * desconocido o un recorrido vencido se borran y devuelven `null`, sin error visible.
 */
export function leerRecorrido(opciones: OpcionesPersistencia = {}): RecorridoGuardado | null {
  let texto: string | null
  try {
    texto = storageDe(opciones)?.getItem(CLAVE_RECORRIDO) ?? null
  } catch {
    return null
  }
  if (texto === null) return null

  let valor: unknown
  try {
    valor = JSON.parse(texto)
  } catch {
    borrarRecorrido(opciones)
    return null
  }
  if (!esRecorridoGuardado(valor)) {
    borrarRecorrido(opciones)
    return null
  }
  const ahora = (opciones.ahora ?? (() => new Date()))().getTime()
  const edad = ahora - Date.parse(valor.guardadoEn)
  if (edad > VIGENCIA_RECORRIDO_MS || edad < -VIGENCIA_RECORRIDO_MS) {
    borrarRecorrido(opciones)
    return null
  }
  return valor
}

export type Restauracion =
  /** No hay nada vigente para restaurar: la app abre en la pantalla inicial. */
  | { tipo: 'ninguna' }
  /** Misma `versionDatos`: dibujar las rutas guardadas desde los nodos, sin recalcular. */
  | { tipo: 'restaurar'; recorrido: RecorridoGuardado }
  /** Otra `versionDatos` y los lugares siguen existiendo: restaurar origen y destino y recalcular. */
  | { tipo: 'recalcular'; recorrido: RecorridoGuardado }
  /** Otra `versionDatos` y algún lugar ya no existe: abrir sin ruta y mostrar el aviso. */
  | { tipo: 'descartada'; mensaje: typeof MENSAJE_RECORRIDO_PERDIDO }

export interface OpcionesRestauracion extends OpcionesPersistencia {
  /** `versionDatos` de los datos cargados ahora. */
  versionDatos: string
  /** Si un id de lugar existe en el catálogo actual. */
  existeLugar: (id: string) => boolean
  /**
   * Si un id de nodo existe en el grafo actual. Si se pasa y una ruta guardada menciona un nodo
   * que no existe, se recalcula aunque la versión coincida (defensa ante datos corruptos).
   */
  existeNodo?: (id: string) => boolean
}

/**
 * Decide qué hacer al arrancar (decisión 6). Es sincrónica para correr antes del primer render.
 * Un recorrido descartado se borra del almacenamiento.
 */
export function decidirRestauracion(opciones: OpcionesRestauracion): Restauracion {
  const recorrido = leerRecorrido(opciones)
  if (!recorrido) return { tipo: 'ninguna' }

  const lugares = [recorrido.origen, recorrido.destino].filter((id): id is string => !!id)
  if (recorrido.versionDatos === opciones.versionDatos) {
    const nodosOk =
      !opciones.existeNodo ||
      recorrido.rutas.every((r) => r.nodos.every((n) => opciones.existeNodo?.(n)))
    if (nodosOk && lugares.every((id) => opciones.existeLugar(id))) {
      return { tipo: 'restaurar', recorrido }
    }
  }
  if (lugares.length > 0 && lugares.every((id) => opciones.existeLugar(id))) {
    return { tipo: 'recalcular', recorrido }
  }
  borrarRecorrido(opciones)
  return { tipo: 'descartada', mensaje: MENSAJE_RECORRIDO_PERDIDO }
}
