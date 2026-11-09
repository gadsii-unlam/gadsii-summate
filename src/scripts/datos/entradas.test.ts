import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import type { GrafoCampus } from '../../src/datos/tipos.ts'
import { DIR_DATOS_FUENTE, DIR_PUBLIC_DATA, RAIZ } from '../rutas-proyecto.ts'
import {
  ARCHIVO_ENTRADAS,
  esEntradaDeEdificio,
  leerEntradas,
  nodosFronteraSinEntrada,
  validarEntradas,
} from './entradas.ts'
import { prepararDatos } from './pipeline.ts'

const temporal = (prefijo: string) => mkdtempSync(join(tmpdir(), prefijo))
const opciones = (dirFuente: string) => ({
  dirFuente,
  dirSalida: temporal('public-data-'),
  mapaConPuntos: join(RAIZ, 'mapa-unlam.svg'),
  dirCache: temporal('cache-'),
  plano: false,
})
const grafo = JSON.parse(readFileSync(join(DIR_PUBLIC_DATA, 'grafo.json'), 'utf8')) as GrafoCampus

function fuentesCon(cambiar: (nombres: Record<string, string>) => void): string {
  const dir = temporal('datos-fuente-')
  cpSync(DIR_DATOS_FUENTE, dir, { recursive: true })
  const archivo = join(dir, ARCHIVO_ENTRADAS)
  const nombres = JSON.parse(readFileSync(archivo, 'utf8')) as Record<string, string>
  cambiar(nombres)
  writeFileSync(archivo, JSON.stringify(nombres))
  return dir
}

describe('entradas.json', () => {
  it('es JSON válido con las 17 entradas de edificio del grafo y los nombres documentados', () => {
    const nombres = leerEntradas(DIR_DATOS_FUENTE)!
    const entradas = grafo.nodos.filter(esEntradaDeEdificio).map((n) => n.id)
    expect(entradas).toHaveLength(17)
    expect(Object.keys(nombres).sort()).toEqual([...entradas].sort())
    expect(nombres['entrada-ed-sur-norte']).toBe('entrada norte')
    expect(nombres['entrada-ed-este-kinesiologia']).toBe('entrada del hall de Kinesiología')
    expect(nombres['entrada-ed-oeste-patio-aulas-250']).toBe('salida al patio de las aulas 250')
    expect(validarEntradas(grafo, nombres)).toEqual([])
  })

  it('un id que no existe en el grafo hace fallar el build', async () => {
    const dir = fuentesCon((n) => {
      n['entrada-ed-sur-sur'] = 'entrada sur'
    })
    const r = await prepararDatos(opciones(dir))
    expect(r.ok).toBe(false)
    const graves = r.problemas.filter((p) => p.severidad === 'error')
    expect(graves.map((p) => p.tipo)).toEqual(['entrada-inexistente'])
    expect(graves[0]!.ids).toEqual(['entrada-ed-sur-sur'])
  })

  it('una clave que no es entrada de edificio (una puerta o una entrada al campus) también falla', () => {
    const problemas = validarEntradas(grafo, {
      'entrada-campus-florencio-varela': 'entrada sur',
      'puerta-aula-121': 'puerta',
    })
    expect(problemas.filter((p) => p.tipo === 'entrada-inexistente')).toHaveLength(2)
  })

  it('una entrada sin nombre solo aparece en el reporte, sin frenar el build', async () => {
    const dir = fuentesCon((n) => {
      delete n['entrada-ed-este-kinesiologia']
    })
    const r = await prepararDatos(opciones(dir))
    expect(r.ok).toBe(true)
    const sinNombre = r.problemas.filter((p) => p.tipo === 'entrada-sin-nombre')
    expect(sinNombre).toHaveLength(1)
    expect(sinNombre[0]!.severidad).toBe('aviso')
    expect(sinNombre[0]!.ids).toEqual(['entrada-ed-este-kinesiologia'])
    expect(r.resumen.some((l) => l.includes('16 de 17'))).toBe(true)
  })

  it('sin archivo, el build sigue y avisa', async () => {
    const dir = fuentesCon(() => {})
    rmSync(join(dir, ARCHIVO_ENTRADAS))
    const r = await prepararDatos(opciones(dir))
    expect(r.ok).toBe(true)
    expect(r.problemas.some((p) => p.tipo === 'entradas-sin-archivo')).toBe(true)
    expect(r.problemas.filter((p) => p.tipo === 'entrada-sin-nombre')).toHaveLength(17)
  })

  it('un nombre vacío no pasa el esquema', async () => {
    const dir = fuentesCon((n) => {
      n['entrada-ed-sur-norte'] = ''
    })
    const r = await prepararDatos(opciones(dir))
    expect(r.ok).toBe(false)
    expect(r.problemas.some((p) => p.tipo === 'fuente-esquema')).toBe(true)
  })
})

describe('nodos frontera sin entrada', () => {
  it('en el grafo actual es solo la llegada de la escalera al 1er piso, y se reporta', async () => {
    expect(nodosFronteraSinEntrada(grafo)).toEqual(['escalera-radio-primer-piso'])
    const r = await prepararDatos(opciones(DIR_DATOS_FUENTE))
    const frontera = r.problemas.filter((p) => p.tipo === 'frontera-sin-entrada')
    expect(frontera).toHaveLength(1)
    expect(frontera[0]!.severidad).toBe('info')
    expect(frontera[0]!.ids).toEqual(['escalera-radio-primer-piso'])
  })
})
