import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIR_DATOS_FUENTE } from '../rutas-proyecto.ts'
import { leerConfig, leerCurados, validarContraEsquema } from './fuentes.ts'
import { ErrorDatos } from './problemas.ts'

const leer = (archivo: string) =>
  JSON.parse(readFileSync(join(DIR_DATOS_FUENTE, archivo), 'utf8')) as Record<string, unknown>
const esquemaCurados = leer('lugares-curados.schema.json')

/** Copia datos-fuente/ a una carpeta temporal y le aplica un cambio a un archivo. */
function fuentesCon(archivo: string, cambio: (datos: Record<string, unknown>) => void): string {
  const dir = mkdtempSync(join(tmpdir(), 'datos-fuente-'))
  cpSync(DIR_DATOS_FUENTE, dir, { recursive: true, filter: (f) => !f.endsWith('.svg') })
  const datos = leer(archivo)
  cambio(datos)
  writeFileSync(join(dir, archivo), JSON.stringify(datos))
  return dir
}

const mensajeDe = (f: () => unknown): string => {
  try {
    f()
  } catch (e) {
    expect(e).toBeInstanceOf(ErrorDatos)
    return (e as Error).message
  }
  throw new Error('no falló')
}

describe('config.json', () => {
  it('tiene los parámetros del plano actual', () => {
    expect(leerConfig()).toEqual({
      metrosPorPx: 0.18,
      toleranciaOrtogonalPx: 0.6,
      diagonalesPermitidas: ['arista__cruce-camino-diagonal-franja__cruce-camino-diagonal-vereda'],
      respaldo: { escala: 1 },
    })
  })

  it('diagonalesPermitidas es opcional y sus ids tienen formato de arista', () => {
    const sinLista = fuentesCon('config.json', (d) => delete d.diagonalesPermitidas)
    expect(leerConfig(sinLista).diagonalesPermitidas).toBeUndefined()
    const mal = fuentesCon('config.json', (d) => (d.diagonalesPermitidas = ['camino']))
    expect(mensajeDe(() => leerConfig(mal))).toContain('"/diagonalesPermitidas/0"')
  })

  it('falla con un mensaje claro si falta un campo', () => {
    const dir = fuentesCon('config.json', (d) => delete d.metrosPorPx)
    expect(mensajeDe(() => leerConfig(dir))).toContain('config.json: falta el campo "metrosPorPx"')
    const dir2 = fuentesCon(
      'config.json',
      (d) => delete (d.respaldo as Record<string, unknown>).escala,
    )
    expect(mensajeDe(() => leerConfig(dir2))).toContain('falta el campo "escala" en "/respaldo"')
  })

  it('falla si falta el archivo', () => {
    expect(mensajeDe(() => leerConfig(join(tmpdir(), 'no-existe')))).toContain(
      'No se encuentra config.json',
    )
  })
})

describe('lugares-curados.json', () => {
  it('el archivo del repo valida contra su JSON Schema', () => {
    expect(validarContraEsquema(leer('lugares-curados.json'), esquemaCurados)).toEqual([])
    expect(leer('lugares-curados.json').$schema).toBe('./lugares-curados.schema.json')
  })

  it('un campo desconocido es un error (en la raíz y dentro de un lugar)', () => {
    const datos = leer('lugares-curados.json')
    expect(validarContraEsquema({ ...datos, nombres: {} }, esquemaCurados)).toEqual([
      'campo desconocido "nombres" en la raíz',
    ])
    const conCampoRaro = structuredClone(datos) as {
      lugares: Record<string, Record<string, unknown>>
    }
    conCampoRaro.lugares['biblioteca'] = { nombre: 'Biblioteca', nomber: 'x' }
    expect(validarContraEsquema(conCampoRaro, esquemaCurados)).toEqual([
      'campo desconocido "nomber" en "/lugares/biblioteca"',
    ])
    const dir = fuentesCon('lugares-curados.json', (d) => (d.extra = true))
    expect(mensajeDe(() => leerCurados(dir))).toContain('campo desconocido "extra"')
  })

  it('tiene un nombre de edificio por cada departamento del plano y los lugares de varias puertas', () => {
    const curados = leerCurados()
    expect(Object.keys(curados.edificios).sort()).toEqual([
      'central',
      'edificio-este',
      'edificio-oeste',
      'edificio-sur',
      'primer-piso',
    ])
    expect(curados.lugares.biblioteca?.puertas).toEqual([
      'acceso-biblioteca-oeste',
      'acceso-biblioteca-este',
    ])
    expect(curados.pendientes).toEqual([])
    expect(curados.exteriorForzado).toEqual({})
  })

  it('los ids de puerta curados aceptan cualquier id de nodo (acceso-…, puerta-…)', () => {
    const datos = structuredClone(leer('lugares-curados.json')) as {
      lugares: Record<string, Record<string, unknown>>
    }
    datos.lugares['biblioteca']!.puertas = ['Acceso Biblioteca']
    expect(validarContraEsquema(datos, esquemaCurados)).toEqual([
      '"/lugares/biblioteca/puertas/0" must match pattern "^[a-z0-9-]+$"',
    ])
  })
})
