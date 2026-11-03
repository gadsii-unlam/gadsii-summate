/**
 * Tarea 1.3 de tolerar-senal-irregular: cambiar un nodo de `grafo.json` cambia `versionDatos`
 * (que usa el recorrido guardado) y la revisión del grafo en el precache del service worker.
 */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { getManifest } from 'workbox-build'
import { afterAll, describe, expect, it } from 'vitest'
import { versionDatos } from '../../src/datos/persistencia.ts'
import type { GrafoFuente } from '../datos/fuentes.ts'
import { leerConfig, leerCurados, leerGrafoFuente } from '../datos/fuentes.ts'
import { enriquecerGrafo, leerEstructura } from '../datos/grafo.ts'
import { armarCatalogo } from '../datos/lugares.ts'
import { EXCLUIDOS_PRECACHE, PATRONES_PRECACHE } from './opciones.ts'

const config = leerConfig()
const curados = leerCurados()

function armar(fuente: GrafoFuente) {
  const { grafo } = enriquecerGrafo(fuente, config.metrosPorPx, curados.exteriorForzado)
  const { catalogo } = armarCatalogo(grafo, curados)
  return { grafo, catalogo }
}

const dirs: string[] = []
afterAll(() => dirs.forEach((d) => rmSync(d, { recursive: true, force: true })))

/** Revisión que Workbox le da a `data/grafo.json` con los mismos patrones que el build. */
async function revisionGrafo(contenido: string): Promise<string | null | undefined> {
  const dir = mkdtempSync(join(tmpdir(), 'dq-rev-'))
  dirs.push(dir)
  mkdirSync(join(dir, 'data'))
  writeFileSync(join(dir, 'data', 'grafo.json'), contenido)
  writeFileSync(join(dir, 'data', 'cierres.json'), '{}')
  const { manifestEntries } = await getManifest({
    globDirectory: dir,
    globPatterns: PATRONES_PRECACHE,
    globIgnores: EXCLUIDOS_PRECACHE,
  })
  expect(manifestEntries?.map((e) => e.url)).toEqual(['data/grafo.json'])
  return manifestEntries?.[0]?.revision
}

describe('versionDatos y revisión del precache', () => {
  const fuente = leerEstructura(leerGrafoFuente()).grafo as GrafoFuente
  const original = armar(fuente)
  const movida = structuredClone(fuente)
  const nodo = movida.nodos[0]
  if (!nodo) throw new Error('grafo vacío')
  nodo.x += 1
  const cambiado = armar(movida)

  it('las fuentes de siempre dan la misma versionDatos', () => {
    const otra = armar(leerEstructura(leerGrafoFuente()).grafo as GrafoFuente)
    expect(versionDatos(otra.grafo, otra.catalogo)).toBe(
      versionDatos(original.grafo, original.catalogo),
    )
  })

  it('mover un nodo cambia la versión del grafo, la del catálogo y versionDatos', () => {
    expect(cambiado.grafo.version).not.toBe(original.grafo.version)
    expect(cambiado.catalogo.versionGrafo).toBe(cambiado.grafo.version)
    expect(versionDatos(cambiado.grafo, cambiado.catalogo)).not.toBe(
      versionDatos(original.grafo, original.catalogo),
    )
  })

  it('mover un nodo cambia la revisión de data/grafo.json en el precache', async () => {
    const antes = await revisionGrafo(`${JSON.stringify(original.grafo)}\n`)
    const despues = await revisionGrafo(`${JSON.stringify(cambiado.grafo)}\n`)
    expect(antes).toMatch(/^[0-9a-f]{32}$/)
    expect(despues).toMatch(/^[0-9a-f]{32}$/)
    expect(despues).not.toBe(antes)
  })
})
