/**
 * Servidor de vista previa propio para los casos que cortan el servidor o cambian de build en el
 * mismo puerto (tolerar-senal-irregular, 6.2 y 8.2). Usa `vite preview` sobre una carpeta ya
 * compilada.
 */
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import { join, resolve } from 'node:path'

export const RAIZ = resolve(import.meta.dirname, '../../..')
/** El build que arma el `webServer` de `tests/e2e/sin-conexion/playwright.config.ts`. */
export const BUILD_SUITE = join(RAIZ, 'node_modules/.cache/dist-sin-conexion')
/** El build de `npm run test:e2e`. */
export const BUILD_PRINCIPAL = join(RAIZ, 'dist')

/**
 * Carpeta compilada a usar: la más reciente entre la de la suite y la de `npm run build` (la que
 * acaba de armar el `webServer` de la configuración con la que se corre).
 */
export function buildBase(): string {
  const candidatos = [BUILD_SUITE, BUILD_PRINCIPAL]
    .filter((d) => existsSync(join(d, 'sw.js')))
    .sort((a, b) => statSync(join(b, 'sw.js')).mtimeMs - statSync(join(a, 'sw.js')).mtimeMs)
  if (!candidatos[0]) throw new Error('No hay un build con sw.js: corré `npx vite build` primero.')
  return candidatos[0]
}

/**
 * Copia el build a `destino` con un `sw.js` distinto (un comentario al final): para el navegador
 * es una versión nueva del service worker.
 */
export function copiarComoVersionNueva(origen: string, destino: string): string {
  rmSync(destino, { recursive: true, force: true })
  mkdirSync(destino, { recursive: true })
  cpSync(origen, destino, { recursive: true })
  const sw = join(destino, 'sw.js')
  writeFileSync(sw, `${readFileSync(sw, 'utf8')}\n// versión nueva ${Date.now()}\n`)
  return destino
}

export interface Servidor {
  url: string
  detener(): Promise<void>
}

export async function iniciarServidor(carpeta: string, puerto: number): Promise<Servidor> {
  const proceso: ChildProcess = spawn(
    'npx',
    ['vite', 'preview', '--outDir', carpeta, '--port', String(puerto), '--strictPort'],
    { cwd: RAIZ, stdio: 'ignore', detached: true },
  )
  const url = `http://localhost:${puerto}`
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(url)
      if (r.ok) break
    } catch {
      // Todavía no levantó.
    }
    await new Promise((r) => setTimeout(r, 100))
    if (i === 99) throw new Error(`vite preview no levantó en ${url}`)
  }
  return {
    url,
    async detener() {
      if (proceso.pid) process.kill(-proceso.pid, 'SIGTERM')
      for (let i = 0; i < 50; i++) {
        try {
          await fetch(url)
        } catch {
          return
        }
        await new Promise((r) => setTimeout(r, 100))
      }
    },
  }
}

/** Compila el plan de salida (`PWA_AUTODESTRUIR=1`): un service worker que se desregistra. */
export function compilarAutodestruccion(destino: string): string {
  const r = spawnSync(
    'npx',
    ['vite', 'build', '--outDir', destino, '--emptyOutDir', '--logLevel', 'error'],
    {
      cwd: RAIZ,
      env: { ...process.env, PWA_AUTODESTRUIR: '1' },
      stdio: 'inherit',
    },
  )
  if (r.status !== 0) throw new Error('no se pudo compilar el plan de salida')
  return destino
}
