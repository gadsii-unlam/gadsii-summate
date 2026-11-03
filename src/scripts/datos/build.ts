/**
 * Pipeline de datos del campus (design.md de preparar-datos-campus, D1):
 *
 *   npm run datos:build                      # datos-fuente/ → public/data/
 *   npm run datos:build -- --fuentes=<dir>   # otra carpeta de fuentes (por ejemplo, un grafo de prueba)
 *   npm run datos:build -- --salida=<dir>    # otra carpeta de salida
 *   npm run datos:build -- --sin-plano       # solo grafo y lugares (sin chequeos del plano ni teselas)
 *
 * Termina con código 1 si alguna validación grave falla. El reporte completo queda en
 * scripts/salida/reporte-datos.md.
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { DIR_DATOS_FUENTE, DIR_PUBLIC_DATA, RAIZ } from '../rutas-proyecto.ts'
import { prepararDatos } from './pipeline.ts'
import { reporteConsola, reporteMarkdown } from './reporte.ts'

const argumento = (nombre: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3)

const dirSalidaReporte = join(RAIZ, 'scripts', 'salida')
const inicio = Date.now()

const resultado = await prepararDatos({
  dirFuente: resolve(argumento('fuentes') ?? DIR_DATOS_FUENTE),
  dirSalida: resolve(argumento('salida') ?? DIR_PUBLIC_DATA),
  mapaConPuntos: resolve(argumento('mapa') ?? join(RAIZ, 'mapa-unlam.svg')),
  dirCache: join(RAIZ, 'node_modules', '.cache', 'datos-campus'),
  plano: !process.argv.includes('--sin-plano'),
  log: (m) => console.log(m),
})

mkdirSync(dirSalidaReporte, { recursive: true })
const archivoReporte = join(dirSalidaReporte, 'reporte-datos.md')
writeFileSync(archivoReporte, reporteMarkdown(resultado.problemas, resultado.resumen))
console.log(reporteConsola(resultado.problemas, resultado.resumen))
console.log(
  `\nReporte completo: ${archivoReporte} (${((Date.now() - inicio) / 1000).toFixed(1)} s)`,
)
if (!resultado.ok) process.exit(1)
