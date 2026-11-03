/**
 * Importa el plano (`mapa-unlam.svg`, con el grafo dibujado en el grupo `grafo`) a `datos-fuente/`:
 *
 * - `datos-fuente/grafo.json`: nodos y aristas del grupo `grafo` (ver `importar.ts`).
 * - `datos-fuente/mapa-base.svg`: el plano sin el grupo `grafo` (lo que dibuja la app).
 * - `grafo.svg`: solo el grupo `grafo`, para superponerlo al plano o copiar ids.
 *
 *   npm run datos:importar
 *   npm run datos:importar -- --mapa=<archivo.svg>   # otro plano
 *
 * Después hay que correr `npm run datos:build`, que valida todo.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { DIR_DATOS_FUENTE, RAIZ } from '../rutas-proyecto.ts'
import { ARCHIVOS_FUENTE } from './fuentes.ts'
import { importarGrafo } from './importar.ts'
import { elementosDeConstruccion, quitarGrafo, soloGrafo } from './svg.ts'

const argumento = (nombre: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3)

const origen = resolve(argumento('mapa') ?? join(RAIZ, 'mapa-unlam.svg'))
const svg = readFileSync(origen, 'utf8')

const { grafo, problemas } = importarGrafo(svg)
if (!grafo) {
  for (const p of problemas) console.error(`- ${p.mensaje}`)
  console.error(`No se pudo importar el grafo de ${origen}; no se escribió nada.`)
  process.exit(1)
}

const base = quitarGrafo(svg)
const restantes = elementosDeConstruccion(base).length
if (restantes > 0) {
  console.error(
    `Fuera del grupo "grafo" quedan ${restantes} elemento(s) con clase nodo o arista; no se escribió nada.`,
  )
  process.exit(1)
}

writeFileSync(join(DIR_DATOS_FUENTE, ARCHIVOS_FUENTE.grafo), `${JSON.stringify(grafo, null, 1)}\n`)
writeFileSync(join(DIR_DATOS_FUENTE, ARCHIVOS_FUENTE.planoBase), base)
writeFileSync(join(RAIZ, 'grafo.svg'), soloGrafo(svg))
console.log(
  `${origen}: ${grafo.nodos.length} nodos y ${grafo.aristas.length} aristas → datos-fuente/grafo.json; plano sin el grafo → datos-fuente/mapa-base.svg; grafo solo → grafo.svg.`,
)
