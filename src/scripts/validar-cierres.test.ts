import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { RAIZ } from './rutas-proyecto.ts'

const dir = mkdtempSync(join(tmpdir(), 'validar-cierres-'))
afterAll(() => rmSync(dir, { recursive: true, force: true }))

/** Corre `scripts/validar-cierres.ts` con tsx y devuelve el código de salida y la salida. */
function validar(contenido?: unknown): { codigo: number; salida: string } {
  const args = [
    join(RAIZ, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    join(RAIZ, 'scripts', 'validar-cierres.ts'),
  ]
  if (contenido !== undefined) {
    const archivo = join(dir, `cierres-${Math.random().toString(36).slice(2)}.json`)
    writeFileSync(archivo, typeof contenido === 'string' ? contenido : JSON.stringify(contenido))
    args.push(`--archivo=${archivo}`)
  }
  try {
    const salida = execFileSync(process.execPath, args, {
      cwd: RAIZ,
      encoding: 'utf8',
      stdio: 'pipe',
    })
    return { codigo: 0, salida }
  } catch (error) {
    const e = error as { status: number; stdout: string; stderr: string }
    return { codigo: e.status, salida: `${e.stdout}${e.stderr}` }
  }
}

describe('npm run validar-cierres', { timeout: 30_000 }, () => {
  it('pasa con el archivo publicado (lista vacía)', () => {
    const r = validar()
    expect(r.codigo).toBe(0)
    expect(r.salida).toContain('El archivo de cierres es válido')
  })

  it('pasa con los cierres del design y lista los lugares que quedan sin acceso', () => {
    const r = validar(
      JSON.stringify({
        version: 1,
        cierres: [
          {
            id: 'escalera-radio',
            motivo: 'Escalera junto a la Radio cerrada por mantenimiento',
            nodos: ['escalera-radio-primer-piso'],
            hasta: '2026-11-05T13:00:00-03:00',
          },
        ],
      }),
    )
    expect(r.codigo).toBe(0)
    expect(r.salida).toContain('deja "Sin acceso ahora": ')
    expect(r.salida).toContain('Laboratorio de Química (Galería del 1er piso)')
    expect(r.salida).toContain('Comedor Universitario (Galería del 1er piso)')
    expect(r.salida).not.toContain('(Edificio Sur)')
  })

  it('falla con un id inventado', () => {
    const r = validar({
      version: 1,
      cierres: [
        { id: 'x', motivo: 'm', nodos: ['entrada-ed-sur-oeste-sur', 'entrada-ed-sur-oeste-99'] },
      ],
    })
    expect(r.codigo).toBe(1)
    expect(r.salida).toContain('id desconocido: entrada-ed-sur-oeste-99 en el cierre x')
  })

  it('falla con JSON inválido o con otra forma', () => {
    expect(validar('{ "version": 1, ').codigo).toBe(1)
    expect(validar({ version: 2, cierres: [] }).codigo).toBe(1)
  })
})
