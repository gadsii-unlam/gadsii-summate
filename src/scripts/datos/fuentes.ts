import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import Ajv, { type ErrorObject } from 'ajv'
import type { CategoriaLugar, Piso } from '../../src/datos/tipos.ts'
import { DIR_DATOS_FUENTE } from '../rutas-proyecto.ts'
import { ErrorDatos, error } from './problemas.ts'

// ---------------------------------------------------------------------------------------------
// Tipos de las fuentes (datos-fuente/)
// ---------------------------------------------------------------------------------------------

export interface ConfigDatos {
  metrosPorPx: number
  toleranciaOrtogonalPx: number
  /** Aristas que pueden ir en diagonal (caminos que en el campus son diagonales de verdad). */
  diagonalesPermitidas?: string[]
  respaldo: { escala: number }
}

export interface CuracionLugar {
  nombre?: string
  edificio?: string
  categoria?: CategoriaLugar
  alias?: string[]
  puertas?: string[]
}

export interface LugarOtroPiso {
  id: string
  nombre: string
  edificio?: string
  depto: string
  categoria?: CategoriaLugar
  piso: Exclude<Piso, 'PB'>
  accesos: string[]
  indicacion: string
  alias?: string[]
  verificado: boolean
}

export interface Pendiente {
  depto: string
  lugar: string
  nota: string
}

export interface LugaresCurados {
  edificios: Record<string, string>
  /** Lugares que no se resaltan como destino aunque el plano tenga una forma detrás de la puerta. */
  sinSala?: string[]
  lugares: Record<string, CuracionLugar>
  referencias: string[]
  otrosPisos: LugarOtroPiso[]
  pendientes: Pendiente[]
  exteriorForzado: Record<string, boolean>
}

/** `departamentos.json`: departamento académico de cada lugar. */
export interface Departamentos {
  nombres: Record<string, string>
  aulas: Record<string, number[]>
  lugares: Record<string, string>
}

/** `grafo.json` tal como lo genera `npm run datos:importar` desde el plano (`mapa-unlam.svg`). */
export interface NodoFuente {
  id: string
  tipo: string
  depto: string
  x: number
  y: number
  /** 0 = planta baja. Si falta, planta baja. */
  piso?: number
  /** Nombre visible del lugar (solo puertas y entradas), tal como está en el plano. */
  nombre?: string
  /** Categoría del lugar cuando el plano la dice (aula, laboratorio, baño). */
  categoria?: CategoriaLugar
  /** Contorno (px del plano) de la sala que está detrás de la puerta, si el plano la tiene. */
  sala?: [number, number][]
}

export interface AristaFuente {
  id: string
  a: string
  b: string
  peso?: number
  /** Al aire libre según el plano. Si falta, se aplica la regla (un extremo en la vereda). */
  exterior?: boolean
}

export interface GrafoFuente {
  ancho: number
  alto: number
  nodos: NodoFuente[]
  aristas: AristaFuente[]
}

// ---------------------------------------------------------------------------------------------
// Lectura y validación contra los JSON Schema
// ---------------------------------------------------------------------------------------------

export const ARCHIVOS_FUENTE = {
  grafo: 'grafo.json',
  config: 'config.json',
  curados: 'lugares-curados.json',
  departamentos: 'departamentos.json',
  planoBase: 'mapa-base.svg',
} as const

export function leerJson(ruta: string, descripcion: string): unknown {
  if (!existsSync(ruta)) {
    throw new ErrorDatos([error('fuente-faltante', `No se encuentra ${descripcion} en ${ruta}.`)])
  }
  try {
    return JSON.parse(readFileSync(ruta, 'utf8')) as unknown
  } catch (e) {
    throw new ErrorDatos([
      error('fuente-json-invalido', `${ruta} no es JSON válido: ${(e as Error).message}`),
    ])
  }
}

function describirError(e: ErrorObject): string {
  const donde = e.instancePath === '' ? 'la raíz' : `"${e.instancePath}"`
  switch (e.keyword) {
    case 'required':
      return `falta el campo "${String(e.params.missingProperty)}" en ${donde}`
    case 'additionalProperties':
      return `campo desconocido "${String(e.params.additionalProperty)}" en ${donde}`
    case 'enum':
      return `${donde} tiene que ser uno de ${JSON.stringify(e.params.allowedValues)}`
    default:
      return `${donde} ${e.message ?? 'no es válido'}`
  }
}

/** Valida `datos` contra un JSON Schema y devuelve los mensajes de error (vacío si valida). */
export function validarContraEsquema(datos: unknown, esquema: object): string[] {
  const ajv = new Ajv({ allErrors: true, strict: false })
  const validar = ajv.compile(esquema)
  if (validar(datos)) return []
  return (validar.errors ?? []).map(describirError)
}

function leerConEsquema<T>(dir: string, archivo: string, archivoEsquema: string): T {
  const ruta = join(dir, archivo)
  const datos = leerJson(ruta, archivo)
  const esquema = leerJson(join(dir, archivoEsquema), archivoEsquema) as object
  const fallas = validarContraEsquema(datos, esquema)
  if (fallas.length > 0) {
    throw new ErrorDatos(
      fallas.map((f) => error('fuente-esquema', `${archivo}: ${f} (ver ${archivoEsquema}).`)),
    )
  }
  const resto = { ...(datos as Record<string, unknown>) }
  delete resto.$schema
  return resto as T
}

export function leerConfig(dir = DIR_DATOS_FUENTE): ConfigDatos {
  return leerConEsquema<ConfigDatos>(dir, ARCHIVOS_FUENTE.config, 'config.schema.json')
}

export function leerCurados(dir = DIR_DATOS_FUENTE): LugaresCurados {
  return leerConEsquema<LugaresCurados>(dir, ARCHIVOS_FUENTE.curados, 'lugares-curados.schema.json')
}

/** Lee `departamentos.json` (si no existe, ningún lugar tiene departamento). */
export function leerDepartamentos(dir = DIR_DATOS_FUENTE): Departamentos | null {
  if (!existsSync(join(dir, ARCHIVOS_FUENTE.departamentos))) return null
  return leerConEsquema<Departamentos>(
    dir,
    ARCHIVOS_FUENTE.departamentos,
    'departamentos.schema.json',
  )
}

/** Lee `grafo.json` sin validar su contenido (eso lo hace `validarGrafo`). */
export function leerGrafoFuente(dir = DIR_DATOS_FUENTE): unknown {
  return leerJson(join(dir, ARCHIVOS_FUENTE.grafo), 'el grafo exportado de Figma (grafo.json)')
}
