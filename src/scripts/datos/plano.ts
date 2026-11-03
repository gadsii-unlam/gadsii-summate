import { writeFileSync } from 'node:fs'
import { Resvg } from '@resvg/resvg-js'
import sharp from 'sharp'
import type { AristaCampus, NodoCampus, PlanoBase } from '../../src/datos/tipos.ts'
import type { ConfigDatos } from './fuentes.ts'
import { error, type Problema } from './problemas.ts'
import { elementosDeConstruccion, leerGrafoSvg } from './svg.ts'
import { hashCorto } from './version.ts'

export interface Imagen {
  /** RGBA, 4 bytes por píxel. */
  pixeles: Buffer
  ancho: number
  alto: number
}

/** Rasteriza un SVG a escala `escala` (1 unidad del SVG = `escala` px de imagen). */
export function renderizar(svg: string | Buffer, escala: number): Imagen {
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'zoom', value: escala },
    font: { loadSystemFonts: false },
    shapeRendering: 2,
  })
  const img = resvg.render()
  return { pixeles: img.pixels, ancho: img.width, alto: img.height }
}

// ---------------------------------------------------------------------------------------------
// Chequeos del plano (design.md, D8)
// ---------------------------------------------------------------------------------------------

/** Error por cada nodo o arista del grafo que quedó en el plano base. */
export function chequearPlanoLimpio(svg: string, archivo: string): Problema[] {
  return elementosDeConstruccion(svg).map((el) => {
    const c = el.caja
    const donde = c ? ` en (${c.x1.toFixed(1)}, ${c.y1.toFixed(1)})` : ''
    const que = el.etiqueta === 'line' ? 'una arista' : 'un nodo'
    return error(
      'plano-con-puntos',
      `${archivo} todavía tiene ${que} del grafo (<${el.etiqueta}>${donde}). Regenerarlo con npm run datos:importar.`,
    )
  })
}

/** Diferencia máxima entre la posición de un nodo en `grafo.json` y su `<circle>` del plano. */
const TOLERANCIA_ALINEACION_PX = 0.01

/**
 * Alineación plano ↔ grafo: cada nodo de `grafo.json` tiene que estar en el grupo `grafo` del
 * plano (`mapa-unlam.svg`) en la misma posición, y cada arista tiene que unir los mismos nodos que
 * una `<line>`. Si no, `grafo.json` quedó desactualizado respecto del plano.
 */
export function chequearAlineacion(
  grafo: {
    nodos: readonly Pick<NodoCampus, 'id' | 'x' | 'y'>[]
    aristas: readonly Pick<AristaCampus, 'id' | 'a' | 'b'>[]
  },
  svgConGrafo: string,
): Problema[] {
  const problemas: Problema[] = []
  const reimportar = 'Correr npm run datos:importar.'
  const leido = leerGrafoSvg(svgConGrafo)
  const circulos = new Map(leido.nodos.map((el) => [el.atributos.id ?? '', el]))
  for (const n of grafo.nodos) {
    const c = circulos.get(n.id)
    if (!c) {
      problemas.push(
        error('plano-desalineado', `El nodo ${n.id} no está en el grafo del plano. ${reimportar}`, [
          n.id,
        ]),
      )
      continue
    }
    const dx = Math.abs(Number(c.atributos.cx) - n.x)
    const dy = Math.abs(Number(c.atributos.cy) - n.y)
    if (dx > TOLERANCIA_ALINEACION_PX || dy > TOLERANCIA_ALINEACION_PX) {
      problemas.push(
        error(
          'plano-desalineado',
          `El nodo ${n.id} (${n.x}, ${n.y}) está en (${c.atributos.cx}, ${c.atributos.cy}) en el plano. ${reimportar}`,
          [n.id],
        ),
      )
    }
  }
  const enGrafo = new Set(grafo.nodos.map((n) => n.id))
  for (const id of circulos.keys()) {
    if (!enGrafo.has(id)) {
      problemas.push(
        error(
          'plano-desalineado',
          `El plano tiene el nodo ${id}, que no está en grafo.json. ${reimportar}`,
          [id],
        ),
      )
    }
  }
  const par = (a: string, b: string) => [a, b].sort().join('|')
  const lineas = new Set(
    leido.aristas.map((el) =>
      par(el.atributos['data-desde'] ?? '', el.atributos['data-hasta'] ?? ''),
    ),
  )
  const aristas = new Set(grafo.aristas.map((a) => par(a.a, a.b)))
  for (const a of grafo.aristas) {
    if (!lineas.has(par(a.a, a.b))) {
      problemas.push(
        error(
          'plano-desalineado',
          `La arista ${a.id} no está en el grafo del plano. ${reimportar}`,
          [a.id],
        ),
      )
    }
  }
  for (const l of leido.aristas) {
    const [a, b] = [l.atributos['data-desde'] ?? '', l.atributos['data-hasta'] ?? '']
    if (!aristas.has(par(a, b))) {
      problemas.push(
        error(
          'plano-desalineado',
          `El plano tiene la arista ${a} ↔ ${b}, que no está en grafo.json. ${reimportar}`,
          [a, b],
        ),
      )
    }
  }
  return problemas
}

// ---------------------------------------------------------------------------------------------
// Plano vectorial para la app
// ---------------------------------------------------------------------------------------------

/**
 * Decimales de las coordenadas de los paths del SVG publicado. El plano ya viene con 2, así que
 * pasar a relativas no pierde precisión (con 1 se ahorra un 20 % más, pero se notan los bordes de
 * las letras chicas).
 */
export const DECIMALES_PLANO = 2

const ARGUMENTOS: Readonly<Record<string, number>> = {
  M: 2,
  L: 2,
  T: 2,
  H: 1,
  V: 1,
  C: 6,
  S: 4,
  Q: 4,
  Z: 0,
}

function formatear(unidades: number, escala: number, decimales: number): string {
  const absoluto = Math.abs(unidades)
  const entero = Math.floor(absoluto / escala)
  const fraccion = absoluto % escala
  const texto =
    fraccion === 0
      ? String(entero)
      : `${entero === 0 ? '' : entero}.${String(fraccion).padStart(decimales, '0').replace(/0+$/, '')}`
  return unidades < 0 ? `-${texto}` : texto
}

/**
 * Reescribe el `d` de un path con coordenadas relativas redondeadas a `decimales`. Cada punto se
 * redondea en absoluto y se escribe como diferencia entre puntos ya redondeados, así el error no
 * se acumula a lo largo del path (nunca es mayor que medio decimal). Los paths con arcos quedan
 * como están (devuelve `null`).
 */
export function compactarPath(d: string, decimales = DECIMALES_PLANO): string | null {
  if (/[Aa]/.test(d)) return null
  const escala = 10 ** decimales
  const r = (v: number) => Math.round(v * escala)
  const fichas = d.match(/[MmLlHhVvCcSsQqTtZz]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []

  let salida = ''
  let ultimaLetra = ''
  let ultimoNumero = ''
  const letra = (l: string) => {
    // Un comando igual al anterior no se repite (salvo moveto y cierre).
    if (l === ultimaLetra && l !== 'm' && l !== 'z') return
    salida += l
    ultimaLetra = l
    ultimoNumero = ''
  }
  const numero = (unidades: number) => {
    const texto = formatear(unidades, escala, decimales)
    const pegado =
      ultimoNumero === '' ||
      texto.startsWith('-') ||
      (texto.startsWith('.') && ultimoNumero.includes('.'))
    salida += (pegado ? '' : ' ') + texto
    ultimoNumero = texto
  }

  // Punto actual y comienzo del subpath, en px y redondeados a `decimales`.
  let x = 0
  let y = 0
  let inicioX = 0
  let inicioY = 0
  let rx = 0
  let ry = 0
  let rInicioX = 0
  let rInicioY = 0
  let i = 0
  let comando = ''
  while (i < fichas.length) {
    if (/^[a-z]$/i.test(fichas[i] as string)) comando = fichas[i++] as string
    const c = comando.toUpperCase()
    const relativo = comando !== c
    const n = ARGUMENTOS[c]
    if (n === undefined) return null
    if (c === 'Z') {
      letra('z')
      x = inicioX
      y = inicioY
      rx = rInicioX
      ry = rInicioY
      continue
    }
    const v = fichas.slice(i, i + n).map(Number)
    if (v.length < n || v.some((num) => !Number.isFinite(num))) return null
    i += n
    if (c === 'H' || c === 'V') {
      const destino = (v[0] as number) + (relativo ? (c === 'H' ? x : y) : 0)
      letra(c.toLowerCase())
      if (c === 'H') {
        numero(r(destino) - rx)
        x = destino
        rx = r(destino)
      } else {
        numero(r(destino) - ry)
        y = destino
        ry = r(destino)
      }
      continue
    }
    // Pares de coordenadas: todos relativos al punto actual del comienzo del segmento.
    const puntos: [number, number][] = []
    for (let k = 0; k < n; k += 2) {
      puntos.push([
        (v[k] as number) + (relativo ? x : 0),
        (v[k + 1] as number) + (relativo ? y : 0),
      ])
    }
    letra(c.toLowerCase())
    for (const [px, py] of puntos) {
      numero(r(px) - rx)
      numero(r(py) - ry)
    }
    const [fx, fy] = puntos[puntos.length - 1] as [number, number]
    x = fx
    y = fy
    rx = r(fx)
    ry = r(fy)
    if (c === 'M') {
      inicioX = x
      inicioY = y
      rInicioX = rx
      rInicioY = ry
      // Los pares que siguen a un moveto son lineto.
      comando = relativo ? 'l' : 'L'
    }
  }
  return salida
}

const MASCARA_RECORTE =
  /<mask id="([^"]+)" style="mask-type:luminance"[^>]*>\s*(<path [^>]*fill="white"\/>)\s*<\/mask>/g

/**
 * SVG que dibuja la app:
 * - El `viewBox` pasa a medir exactamente `ancho × alto` (si el exportador lo redondeó a px
 *   enteros), así 1 unidad del SVG es 1 px del plano y del grafo al estirarlo sobre el plano.
 * - Los recortes exportados como máscaras de luminancia con un único path blanco pasan a
 *   `clipPath`, que el navegador dibuja mucho más rápido (no arma una capa por cada máscara).
 * - Los paths pasan a coordenadas relativas con `DECIMALES_PLANO` decimales (`compactarPath`):
 *   el plano pesa casi la mitad y se ve igual.
 * - Se sacan los saltos de línea entre etiquetas.
 */
export function svgParaLaApp(
  svgBase: string,
  ancho: number,
  alto: number,
): { svg: string; mascaras: number } {
  const ids: string[] = []
  let svg = svgBase.replace(MASCARA_RECORTE, (_, id: string, path: string) => {
    ids.push(id)
    return `<clipPath id="${id}">${path}</clipPath>`
  })
  for (const id of ids) svg = svg.replaceAll(`mask="url(#${id})"`, `clip-path="url(#${id})"`)
  svg = svg.replace(/ d="([^"]*)"/g, (original, d: string) => {
    const compacto = compactarPath(d)
    return compacto === null ? original : ` d="${compacto}"`
  })
  svg = svg.replace(/<svg [^>]*>/, (raiz) =>
    raiz
      .replace(/ width="[^"]*"/, ` width="${ancho}"`)
      .replace(/ height="[^"]*"/, ` height="${alto}"`)
      .replace(/ viewBox="[^"]*"/, ` viewBox="0 0 ${ancho} ${alto}"`),
  )
  return { svg: svg.replace(/>\s+</g, '><').trim(), mascaras: ids.length }
}

// ---------------------------------------------------------------------------------------------
// Versión y respaldo
// ---------------------------------------------------------------------------------------------

export function versionPlano(
  svgBase: string,
  anchoPlano: number,
  altoPlano: number,
  config: ConfigDatos,
): string {
  const parametros = {
    anchoPlano,
    altoPlano,
    respaldo: config.respaldo,
    decimales: DECIMALES_PLANO,
  }
  return hashCorto(JSON.stringify(parametros) + svgBase)
}

/** Imagen única de respaldo a escala `config.respaldo.escala`. */
export async function generarRespaldo(
  svgBase: string,
  anchoPlano: number,
  altoPlano: number,
  config: ConfigDatos,
  archivo: string,
): Promise<{ ancho: number; alto: number; bytes: number }> {
  const escala = config.respaldo.escala
  const img = renderizar(svgBase, escala)
  const ancho = Math.min(Math.round(anchoPlano * escala), img.ancho)
  const alto = Math.min(Math.round(altoPlano * escala), img.alto)
  const buffer = await sharp(img.pixeles, {
    raw: { width: img.ancho, height: img.alto, channels: 4 },
  })
    .extract({ left: 0, top: 0, width: ancho, height: alto })
    .webp({ lossless: true, effort: 4 })
    .toBuffer()
  writeFileSync(archivo, buffer)
  return { ancho, alto, bytes: buffer.length }
}

export function describirPlano(
  version: string,
  anchoPlano: number,
  altoPlano: number,
  config: ConfigDatos,
  respaldo: { ancho: number; alto: number },
): PlanoBase {
  return {
    version,
    ancho: anchoPlano,
    alto: altoPlano,
    url: `/data/mapa-base.svg?v=${version}`,
    respaldo: {
      url: `/data/mapa-base.webp?v=${version}`,
      escala: config.respaldo.escala,
      ancho: respaldo.ancho,
      alto: respaldo.alto,
    },
  }
}
