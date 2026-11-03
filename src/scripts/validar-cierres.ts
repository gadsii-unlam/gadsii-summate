/**
 * Chequeo estricto de `public/data/cierres.json` (design.md de aplicar-cierres-temporales,
 * decisión 5). Usa la misma validación que la app, pero cualquier problema (id desconocido,
 * fecha inválida, `hasta` no posterior a `desde`, id de cierre repetido, motivo faltante…)
 * termina con código 1. Además lista los lugares que quedarían "Sin acceso ahora".
 *
 *   npm run validar-cierres                         # public/data/cierres.json
 *   npm run validar-cierres -- --archivo=<ruta>     # otro archivo de cierres
 *
 * Necesita `public/data/grafo.json` y `lugares.json` (los genera `npm run datos:build`).
 */
import { existsSync, readFileSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import type { CatalogoLugares, GrafoCampus } from '../src/datos/index.ts'
import { lugaresSinAcceso } from '../src/cierres/accesibilidad.ts'
import { formatearDiaHora } from '../src/cierres/fechas.ts'
import type { Cierre } from '../src/cierres/tipos.ts'
import { indexarGrafo, validarCierres } from '../src/cierres/validar.ts'
import { tramosDeCierres } from '../src/cierres/vigencia.ts'
import { prepararGrafoRuteable } from '../src/rutas/grafo-ruteable.ts'
import { DIR_PUBLIC_DATA, RAIZ } from './rutas-proyecto.ts'

const argumento = (nombre: string): string | undefined =>
  process.argv.find((a) => a.startsWith(`--${nombre}=`))?.slice(nombre.length + 3)

const archivo = resolve(argumento('archivo') ?? join(DIR_PUBLIC_DATA, 'cierres.json'))
const archivoGrafo = join(DIR_PUBLIC_DATA, 'grafo.json')
const archivoLugares = join(DIR_PUBLIC_DATA, 'lugares.json')
const mostrar = (ruta: string) => {
  const rel = relative(RAIZ, ruta)
  return rel === '' || rel.startsWith('..') ? ruta : rel
}

function fallar(mensaje: string): never {
  console.error(`✗ ${mensaje}`)
  process.exit(1)
}

for (const requerido of [archivoGrafo, archivoLugares]) {
  if (!existsSync(requerido)) {
    fallar(`falta ${mostrar(requerido)}: corré antes \`npm run datos:build\``)
  }
}
if (!existsSync(archivo)) fallar(`no existe ${mostrar(archivo)}`)

let datos: unknown
try {
  datos = JSON.parse(readFileSync(archivo, 'utf8'))
} catch (error) {
  fallar(`${mostrar(archivo)} no es JSON válido: ${error instanceof Error ? error.message : error}`)
}

const grafoCampus = JSON.parse(readFileSync(archivoGrafo, 'utf8')) as GrafoCampus
const { lugares } = JSON.parse(readFileSync(archivoLugares, 'utf8')) as CatalogoLugares
const grafo = prepararGrafoRuteable(grafoCampus)
const { formaValida, cierres, problemas } = validarCierres(datos, indexarGrafo(grafoCampus))

console.log(`Cierres: ${mostrar(archivo)} (grafo ${grafoCampus.version})`)
if (!formaValida) fallar('el archivo no tiene la forma { "version": 1, "cierres": [...] }')

const nombre = new Map(lugares.map((l) => [l.id, `${l.nombre} (${l.edificio})`]))
const sinAccesoCon = (lista: readonly Cierre[]) =>
  [...lugaresSinAcceso(grafo, lugares, tramosDeCierres(lista))].map((id) => nombre.get(id) ?? id)

const vigencia = (c: Cierre) => {
  if (c.siempreVigente) return 'siempre (fecha inválida)'
  const desde = c.desde === null ? 'siempre' : formatearDiaHora(c.desde)
  const hasta = c.hasta === null ? 'sin fin' : formatearDiaHora(c.hasta)
  return `${desde} → ${hasta}`
}

console.log(`\n${cierres.length} cierre(s):`)
for (const c of cierres) {
  const tramos = [...c.nodos, ...c.aristas].join(', ')
  console.log(`  • ${c.id}: ${c.motivo}\n      cierra: ${tramos}\n      vigencia: ${vigencia(c)}`)
  const aislados = sinAccesoCon([c])
  if (aislados.length > 0) console.log(`      deja "Sin acceso ahora": ${aislados.join('; ')}`)
}
if (cierres.length > 1) {
  const todos = sinAccesoCon(cierres)
  console.log(
    `\nCon todos los cierres a la vez quedan "Sin acceso ahora" ${todos.length} lugar(es)${
      todos.length > 0 ? `: ${todos.join('; ')}` : ''
    }`,
  )
}

if (problemas.length > 0) {
  console.error(`\n${problemas.length} problema(s):`)
  for (const p of problemas) console.error(`  ✗ ${p.mensaje}`)
  process.exit(1)
}
console.log('\n✓ El archivo de cierres es válido.')
