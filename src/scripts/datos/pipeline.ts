import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import type { CatalogoLugares, GrafoCampus, PlanoBase } from '../../src/datos/tipos.ts'
import {
  ARCHIVOS_FUENTE,
  leerConfig,
  leerCurados,
  leerDepartamentos,
  leerGrafoFuente,
} from './fuentes.ts'
import { leerEntradas, reportarFrontera, validarEntradas } from './entradas.ts'
import { enriquecerGrafo, leerEstructura, validarGrafo } from './grafo.ts'
import { armarCatalogo } from './lugares.ts'
import {
  chequearAlineacion,
  chequearPlanoLimpio,
  describirPlano,
  generarRespaldo,
  svgParaLaApp,
  versionPlano,
} from './plano.ts'
import { ErrorDatos, error, errores, type Problema } from './problemas.ts'

export interface OpcionesPipeline {
  /** Carpeta con grafo.json, config.json, lugares-curados.json y mapa-base.svg. */
  dirFuente: string
  /** Carpeta donde se escriben los datos generados (public/data/). */
  dirSalida: string
  /** Plano con el grafo dibujado (mapa-unlam.svg), para el chequeo de alineación. */
  mapaConPuntos: string
  /** Carpeta de caché (respaldo ya rasterizado). */
  dirCache: string
  /** `false` para saltear el plano (solo grafo y lugares). */
  plano?: boolean
  log?: (mensaje: string) => void
}

export interface ResultadoPipeline {
  ok: boolean
  problemas: Problema[]
  resumen: string[]
  grafo?: GrafoCampus
  catalogo?: CatalogoLugares
  plano?: PlanoBase
}

const mb = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(2)} MB`

function escribirJson(archivo: string, datos: unknown): void {
  mkdirSync(dirname(archivo), { recursive: true })
  writeFileSync(archivo, `${JSON.stringify(datos)}\n`)
}

/** Corre todo el pipeline: valida, genera los datos y devuelve los problemas para el reporte. */
export async function prepararDatos(op: OpcionesPipeline): Promise<ResultadoPipeline> {
  const log = op.log ?? (() => {})
  const problemas: Problema[] = []
  const resumen: string[] = []
  const fallar = (): ResultadoPipeline => ({ ok: false, problemas, resumen })

  // 1. Fuentes.
  let config, curados, crudo, entradas, departamentos
  try {
    config = leerConfig(op.dirFuente)
    curados = leerCurados(op.dirFuente)
    crudo = leerGrafoFuente(op.dirFuente)
    entradas = leerEntradas(op.dirFuente)
    departamentos = leerDepartamentos(op.dirFuente)
  } catch (e) {
    if (e instanceof ErrorDatos) {
      problemas.push(...e.problemas)
      return fallar()
    }
    throw e
  }

  // 2. Grafo.
  const estructura = leerEstructura(crudo)
  problemas.push(...estructura.problemas)
  if (!estructura.grafo) return fallar()
  const fuente = estructura.grafo
  problemas.push(...validarGrafo(fuente, config.toleranciaOrtogonalPx, config.diagonalesPermitidas))
  if (errores(problemas).length > 0) return fallar()
  const { grafo, problemas: avisosGrafo } = enriquecerGrafo(
    fuente,
    config.metrosPorPx,
    curados.exteriorForzado,
  )
  problemas.push(...avisosGrafo)
  const exteriores = grafo.aristas.filter((a) => a.exterior)
  const pxTotal = grafo.aristas.reduce((s, a) => s + a.px, 0)
  const pxExterior = exteriores.reduce((s, a) => s + a.px, 0)
  const porTipo = (t: string) => grafo.nodos.filter((n) => n.tipo === t).length
  resumen.push(
    `Grafo ${grafo.version}: ${grafo.nodos.length} nodos (${porTipo('puerta')} puertas, ${porTipo('pasillo')} pasillos, ${porTipo('entrada')} entradas) y ${grafo.aristas.length} aristas (${exteriores.length} exteriores, ${grafo.aristas.length - exteriores.length} interiores).`,
    `Longitud total ${pxTotal.toFixed(2)} px (${pxExterior.toFixed(2)} px exteriores); ${config.metrosPorPx} m/px.`,
  )

  // 2b. Nombres de las entradas de edificio y nodos frontera (mostrar-ruta-e-indicaciones).
  const problemasEntradas = validarEntradas(grafo, entradas)
  problemas.push(...problemasEntradas, ...reportarFrontera(grafo))
  if (errores(problemas).length > 0) return fallar()
  const totalEntradas = grafo.nodos.filter((n) => n.tipo === 'entrada' && n.depto !== 'central')
  const sinNombre = problemasEntradas.filter((p) => p.tipo === 'entrada-sin-nombre').length
  resumen.push(
    `Entradas de edificio: ${totalEntradas.length - sinNombre} de ${totalEntradas.length} con nombre en entradas.json.`,
  )

  // 3. Catálogo.
  const { catalogo, problemas: problemasCatalogo } = armarCatalogo(
    grafo,
    curados,
    fuente.nodos,
    departamentos,
  )
  problemas.push(...problemasCatalogo)
  const idsNodos = new Set(grafo.nodos.map((n) => n.id))
  for (const l of catalogo.lugares) {
    for (const p of l.puertas) {
      if (!idsNodos.has(p)) {
        problemas.push(
          error(
            'lugar-puerta-inexistente',
            `El lugar ${l.id} tiene la puerta ${p}, que no existe en el grafo.`,
            [l.id, p],
          ),
        )
      }
    }
  }
  if (errores(problemas).length > 0) return fallar()
  const categorias = new Map<string, number>()
  for (const l of catalogo.lugares)
    categorias.set(l.categoria, (categorias.get(l.categoria) ?? 0) + 1)
  resumen.push(
    `Lugares ${catalogo.version}: ${catalogo.lugares.length} (${[...categorias].map(([c, n]) => `${n} ${c}`).join(', ')}); ${catalogo.lugares.filter((l) => l.referencia).length} referencias; ${catalogo.lugares.filter((l) => l.departamento).length} con departamento y ${catalogo.lugares.filter((l) => l.sala).length} con sala para resaltar.`,
  )

  // 4. Plano base: chequeos antes de escribir nada.
  let plano: PlanoBase | undefined
  let svgBase = ''
  if (op.plano !== false) {
    const archivoBase = join(op.dirFuente, ARCHIVOS_FUENTE.planoBase)
    if (!existsSync(archivoBase)) {
      problemas.push(
        error(
          'fuente-faltante',
          `No se encuentra el plano base ${archivoBase}. Generarlo con npm run datos:importar.`,
        ),
      )
      return fallar()
    }
    svgBase = readFileSync(archivoBase, 'utf8')
    problemas.push(...chequearPlanoLimpio(svgBase, ARCHIVOS_FUENTE.planoBase))

    if (!existsSync(op.mapaConPuntos)) {
      problemas.push(
        error(
          'fuente-faltante',
          `No se encuentra ${op.mapaConPuntos} (el plano con el grafo, para el chequeo de alineación).`,
        ),
      )
    } else {
      const desalineados = chequearAlineacion(grafo, readFileSync(op.mapaConPuntos, 'utf8'))
      problemas.push(...desalineados)
      const nodosMal = new Set(desalineados.flatMap((p) => p.ids ?? []))
      resumen.push(
        `Alineación: ${grafo.nodos.filter((n) => !nodosMal.has(n.id)).length} de ${grafo.nodos.length} nodos en su lugar del plano (${desalineados.length} diferencias con ${op.mapaConPuntos.split('/').pop()}).`,
      )
    }
    if (errores(problemas).length > 0) return fallar()
  }

  // 5. Escribir los datos.
  escribirJson(join(op.dirSalida, 'grafo.json'), grafo)
  escribirJson(join(op.dirSalida, 'lugares.json'), catalogo)

  if (op.plano !== false) {
    const version = versionPlano(svgBase, grafo.ancho, grafo.alto, config)
    const { svg, mascaras } = svgParaLaApp(svgBase, grafo.ancho, grafo.alto)
    writeFileSync(join(op.dirSalida, 'mapa-base.svg'), svg)
    // Las teselas ya no se usan: se borran las que haya dejado una versión anterior del pipeline.
    rmSync(join(op.dirSalida, 'teselas'), { recursive: true, force: true })

    // El respaldo se rasteriza solo si cambió el plano (la marca va en la caché, no se publica).
    const marcaRespaldo = join(op.dirCache, `respaldo-${version}.json`)
    const archivoRespaldo = join(op.dirSalida, 'mapa-base.webp')
    let respaldo: { ancho: number; alto: number; bytes: number }
    if (existsSync(marcaRespaldo) && existsSync(archivoRespaldo)) {
      log(`Respaldo ${version}: sin cambios en el plano, se reusa.`)
      respaldo = JSON.parse(readFileSync(marcaRespaldo, 'utf8')) as typeof respaldo
    } else {
      log(`Respaldo ${version}: rasterizando el plano…`)
      respaldo = await generarRespaldo(svgBase, grafo.ancho, grafo.alto, config, archivoRespaldo)
      mkdirSync(op.dirCache, { recursive: true })
      writeFileSync(marcaRespaldo, JSON.stringify(respaldo))
    }
    plano = describirPlano(version, grafo.ancho, grafo.alto, config, respaldo)
    escribirJson(join(op.dirSalida, 'plano.json'), plano)
    resumen.push(
      `Plano ${version}: mapa-base.svg de ${mb(Buffer.byteLength(svg))} (${mascaras} máscaras pasadas a recortes).`,
      `Respaldo mapa-base.webp: ${respaldo.ancho} × ${respaldo.alto} px, ${mb(respaldo.bytes)}.`,
    )
  }

  return { ok: true, problemas, resumen, grafo, catalogo, ...(plano ? { plano } : {}) }
}
