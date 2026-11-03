import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import type { ConfigDatos } from './fuentes.ts'
import {
  DECIMALES_PLANO,
  chequearAlineacion,
  chequearPlanoLimpio,
  compactarPath,
  describirPlano,
  generarRespaldo,
  renderizar,
  svgParaLaApp,
  versionPlano,
} from './plano.ts'
import { DIR_DATOS_FUENTE } from '../rutas-proyecto.ts'

const config: ConfigDatos = {
  metrosPorPx: 0.35,
  toleranciaOrtogonalPx: 0.6,
  respaldo: { escala: 1.5 },
}

const mapaPrueba = (
  puntos: [number, number][],
) => `<svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
<rect x="0" y="0" width="300" height="200" fill="#FED57B"/>
<rect x="0" y="0" width="4" height="4" fill="#FF0000"/>
${puntos.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="2.5" fill="${i % 2 ? '#C79AFF' : '#9ADCFF'}"/>`).join('\n')}
</svg>`

/** Plano con un grafo de tres nodos en L: a (50, 50) — b (120.5, 50) — c (120.5, 150). */
const conGrafo = (
  nodos: [string, number, number][] = [
    ['a', 50, 50],
    ['b', 120.5, 50],
    ['c', 120.5, 150],
  ],
  aristas: [string, string][] = [
    ['a', 'b'],
    ['b', 'c'],
  ],
) => `<svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
<rect width="300" height="200" fill="#FFFFFF"/>
<g id="grafo"><g id="aristas">
${aristas.map(([a, b]) => `<line class="arista" data-desde="${a}" data-hasta="${b}"/>`).join('\n')}
</g><g id="nodos">
${nodos.map(([id, x, y]) => `<circle id="${id}" class="nodo" cx="${x}" cy="${y}" r="4"/>`).join('\n')}
</g></g>
</svg>`

describe('chequeo de alineación', () => {
  const grafo = {
    nodos: [
      { id: 'a', x: 50, y: 50 },
      { id: 'b', x: 120.5, y: 50 },
      { id: 'c', x: 120.5, y: 150 },
    ],
    aristas: [
      { id: 'arista__a__b', a: 'a', b: 'b' },
      { id: 'arista__b__c', a: 'b', b: 'c' },
    ],
  }
  const ids = (svg: string, g = grafo) => chequearAlineacion(g, svg).map((p) => p.ids)

  it('pasa si cada nodo y cada arista están en el grafo del plano (la arista en cualquier sentido)', () => {
    expect(chequearAlineacion(grafo, conGrafo())).toEqual([])
    const alReves = conGrafo(undefined, [
      ['b', 'a'],
      ['c', 'b'],
    ])
    expect(chequearAlineacion(grafo, alReves)).toEqual([])
  })

  it('falla si un nodo se movió más de 0,01 px, nombrándolo', () => {
    const movidos = {
      ...grafo,
      nodos: grafo.nodos.map((n) => (n.id === 'b' ? { ...n, x: n.x + 10 } : n)),
    }
    const ps = chequearAlineacion(movidos, conGrafo())
    expect(ps.map((p) => [p.tipo, p.ids])).toEqual([['plano-desalineado', ['b']]])
    expect(ps[0]?.mensaje).toContain('npm run datos:importar')
    const casi = { ...grafo, nodos: grafo.nodos.map((n) => ({ ...n, x: n.x + 0.005 })) }
    expect(chequearAlineacion(casi, conGrafo())).toEqual([])
  })

  it('falla si falta un nodo en el plano o el plano tiene uno de más', () => {
    const sinC = conGrafo(
      [
        ['a', 50, 50],
        ['b', 120.5, 50],
      ],
      [['a', 'b']],
    )
    expect(ids(sinC)).toEqual([['c'], ['arista__b__c']])
    const conD = conGrafo([
      ['a', 50, 50],
      ['b', 120.5, 50],
      ['c', 120.5, 150],
      ['d', 200, 150],
    ])
    expect(ids(conD)).toEqual([['d']])
  })

  it('falla si falta una arista en el plano o el plano tiene una de más', () => {
    expect(ids(conGrafo(undefined, [['a', 'b']]))).toEqual([['arista__b__c']])
    const otra = conGrafo(undefined, [
      ['a', 'b'],
      ['b', 'c'],
      ['a', 'c'],
    ])
    expect(ids(otra)).toEqual([['a', 'c']])
  })
})

describe('chequeo de plano limpio', () => {
  it('es un error por cada nodo o arista del grafo que queda', () => {
    expect(chequearPlanoLimpio(conGrafo(), 'x.svg').map((p) => p.tipo)).toEqual([
      'plano-con-puntos',
      'plano-con-puntos',
      'plano-con-puntos',
      'plano-con-puntos',
      'plano-con-puntos',
    ])
    const suelto = mapaPrueba([]).replace(
      '</svg>',
      '<circle class="nodo" cx="9" cy="9" r="4"/></svg>',
    )
    const ps = chequearPlanoLimpio(suelto, 'x.svg')
    expect(ps).toHaveLength(1)
    expect(ps[0]?.mensaje).toContain('npm run datos:importar')
  })

  it('los círculos chicos del plano que no son del grafo no cuentan', () => {
    expect(chequearPlanoLimpio(mapaPrueba([[10, 10]]), 'x.svg')).toEqual([])
  })
})

// ---------------------------------------------------------------------------------------------
// Paths compactos
// ---------------------------------------------------------------------------------------------

const ARGS: Record<string, number> = { M: 2, L: 2, T: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, Z: 0 }

/**
 * Decodificador de prueba: todos los puntos de un `d` (extremos y controles) en absoluto, en orden.
 * Acepta comandos absolutos y relativos y los pares implícitos después de un moveto.
 */
function puntosAbsolutos(d: string): [number, number][] {
  const fichas = d.match(/[a-z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []
  const puntos: [number, number][] = []
  let x = 0
  let y = 0
  let x0 = 0
  let y0 = 0
  let cmd = ''
  let i = 0
  while (i < fichas.length) {
    if (/^[a-z]$/i.test(fichas[i]!)) cmd = fichas[i++]!
    const c = cmd.toUpperCase()
    const rel = cmd !== c
    if (c === 'Z') {
      x = x0
      y = y0
      continue
    }
    const v = fichas.slice(i, i + ARGS[c]!).map(Number)
    i += ARGS[c]!
    if (c === 'H') x = v[0]! + (rel ? x : 0)
    else if (c === 'V') y = v[0]! + (rel ? y : 0)
    if (c === 'H' || c === 'V') {
      puntos.push([x, y])
      continue
    }
    const pares: [number, number][] = []
    for (let k = 0; k < v.length; k += 2)
      pares.push([v[k]! + (rel ? x : 0), v[k + 1]! + (rel ? y : 0)])
    puntos.push(...pares)
    ;[x, y] = pares[pares.length - 1]!
    if (c === 'M') {
      x0 = x
      y0 = y
      cmd = rel ? 'l' : 'L'
    }
  }
  return puntos
}

/** Compara los puntos del path compacto con los originales redondeados a `decimales`. */
function esperarRedondeado(original: string, decimales: number) {
  const compacto = compactarPath(original, decimales)
  expect(compacto).not.toBeNull()
  const f = 10 ** decimales
  const esperado = puntosAbsolutos(original).map(([x, y]) => [Math.round(x * f), Math.round(y * f)])
  const obtenido = puntosAbsolutos(compacto!).map(([x, y]) => [x * f, y * f])
  expect(obtenido).toHaveLength(esperado.length)
  obtenido.forEach(([x, y], k) => {
    expect(Math.abs(x! - esperado[k]![0]!)).toBeLessThan(1e-6)
    expect(Math.abs(y! - esperado[k]![1]!)).toBeLessThan(1e-6)
  })
  return compacto!
}

describe('compactarPath', () => {
  it('pasa un path absoluto a relativo sin perder precisión', () => {
    const d = 'M2161.91 1842.26L2516.23 592.76H1776.26V3159.77L2100.62 3155.08L2161.91 1842.26Z'
    const compacto = esperarRedondeado(d, 2)
    expect(compacto).toBe(
      'm2161.91 1842.26l354.32-1249.5h-739.97v2567.01l324.36-4.69 61.29-1312.82z',
    )
    expect(compacto.length).toBeLessThan(d.length)
  })

  it('curvas, cuadráticas y comandos relativos de entrada', () => {
    esperarRedondeado('M10 10C20 0 30 0 40 10S60 20 70 10Q80 0 90 10T110 10Z', 2)
    esperarRedondeado('m10.123 10.456c1.11 2.22 3.33 4.44 5.55 6.66l-3.21 4.32h7.77v-1.23z', 2)
    esperarRedondeado('m10 10l5 5 5 5 5 5m20 0l1 1z', 1)
  })

  it('los pares que siguen a un moveto son lineto', () => {
    const compacto = esperarRedondeado('M0 0 10 0 10 10Z', 2)
    expect(compacto).toBe('m0 0l10 0 0 10z')
  })

  it('después de z, el punto actual vuelve al comienzo del subpath', () => {
    esperarRedondeado('M10 10H20V20ZM30 30L40 40ZL50 50', 2)
  })

  it('un comando repetido sin letra deja el separador (no pega "6" con "2")', () => {
    expect(compactarPath('M0 0C1 2 3 4 5 6 7 8 9 10 11 12', 2)).toBe('m0 0c1 2 3 4 5 6 2 2 4 4 6 6')
    expect(compactarPath('M0 0L1 1L2 2L3 3', 2)).toBe('m0 0l1 1 1 1 1 1')
  })

  it('escribe los números cortos: sin cero adelante, sin separador antes de - o de un segundo punto', () => {
    expect(compactarPath('M0 0L0.5 0.25', 2)).toBe('m0 0l.5.25')
    expect(compactarPath('M1 1L0 0', 2)).toBe('m1 1l-1-1')
    expect(compactarPath('M1.5 1L2 1', 2)).toBe('m1.5 1l.5 0')
  })

  it('en un path largo el redondeo no se acumula', () => {
    const d = `M0.04 0.04${' l0.333 0.777'.repeat(500)}`
    const compacto = esperarRedondeado(d, 1)
    const [x, y] = puntosAbsolutos(compacto).at(-1)!
    expect(x).toBeCloseTo(Math.round((0.04 + 500 * 0.333) * 10) / 10, 6)
    expect(y).toBeCloseTo(Math.round((0.04 + 500 * 0.777) * 10) / 10, 6)
  })

  it('deja como están los paths con arcos', () => {
    expect(compactarPath('M0 0A5 5 0 0 1 10 10')).toBeNull()
    const svg =
      '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M0 0A5 5 0 0 1 10 10"/></svg>'
    expect(svgParaLaApp(svg, 10, 10).svg).toContain('d="M0 0A5 5 0 0 1 10 10"')
  })
})

describe('plano vectorial para la app', () => {
  const conMascara = `<svg width="300" height="200" viewBox="0 0 300 200" fill="none" xmlns="http://www.w3.org/2000/svg">
<rect width="300" height="200" fill="#FED57B"/>
<mask id="mask0_1_2" style="mask-type:luminance" maskUnits="userSpaceOnUse" x="10" y="10" width="100" height="50">
<path d="M110 10H10V60H110V10Z" fill="white"/>
</mask>
<g mask="url(#mask0_1_2)">
<path d="M0 0H300V200H0Z" fill="#A3BB76"/>
</g>
</svg>`

  it('pasa las máscaras de un path blanco a recortes sin cambiar el dibujo', () => {
    const { svg, mascaras } = svgParaLaApp(conMascara, 300, 200)
    expect(mascaras).toBe(1)
    expect(svg).not.toMatch(/<mask|mask="/)
    expect(svg).toContain(
      '<clipPath id="mask0_1_2"><path d="m110 10h-100v50h100v-50z" fill="white"/></clipPath>',
    )
    expect(svg).toContain('<g clip-path="url(#mask0_1_2)">')
    expect(renderizar(svg, 1).pixeles.equals(renderizar(conMascara, 1).pixeles)).toBe(true)
  })

  it('ajusta el viewBox al tamaño exacto del plano y saca los saltos de línea', () => {
    const { svg } = svgParaLaApp(conMascara, 299.6, 199.7)
    expect(svg).toMatch(/^<svg width="299.6" height="199.7" viewBox="0 0 299.6 199.7" /)
    expect(svg).not.toContain('\n')
  })

  it('pasa los paths a relativos con DECIMALES_PLANO decimales', () => {
    const { svg } = svgParaLaApp(conMascara, 300, 200)
    expect(DECIMALES_PLANO).toBe(2)
    expect(svg).toContain('<path d="m110 10h-100v50h100v-50z" fill="white"/>')
  })

  it('con el plano real, el dibujo queda igual píxel a píxel y pesa casi la mitad', () => {
    const base = readFileSync(join(DIR_DATOS_FUENTE, 'mapa-base.svg'), 'utf8')
    const { svg, mascaras } = svgParaLaApp(base, 2810, 3745)
    // El plano actual no trae máscaras de luminancia.
    expect(mascaras).toBe(0)
    expect(svg).not.toMatch(/<mask|mask="/)
    expect(svg.length).toBeLessThan(base.length * 0.6)
    // A escala 0,5: un render más chico alcanza para comparar y es rápido.
    const a = renderizar(base, 0.5)
    const b = renderizar(svg, 0.5)
    expect([b.ancho, b.alto]).toEqual([a.ancho, a.alto])
    let distintos = 0
    for (let i = 0; i < a.pixeles.length; i++) {
      if (Math.abs((a.pixeles[i] as number) - (b.pixeles[i] as number)) > 8) distintos++
    }
    expect(distintos / a.pixeles.length).toBeLessThan(0.001)
  })
})

describe('respaldo y descripción del plano', () => {
  it('la imagen de respaldo mide el plano × 1,5', async () => {
    const archivo = join(mkdtempSync(join(tmpdir(), 'respaldo-')), 'mapa-base.webp')
    const r = await generarRespaldo(mapaPrueba([]), 300, 200, config, archivo)
    expect([r.ancho, r.alto]).toEqual([450, 300])
    expect(await sharp(archivo).metadata()).toMatchObject({
      format: 'webp',
      width: 450,
      height: 300,
    })
  })

  it('la versión cambia si cambia el plano o los parámetros del respaldo', () => {
    const v = versionPlano('<svg/>', 300, 200, config)
    expect(versionPlano('<svg/>', 300, 200, config)).toBe(v)
    expect(versionPlano('<svg />', 300, 200, config)).not.toBe(v)
    expect(versionPlano('<svg/>', 300, 200, { ...config, respaldo: { escala: 1 } })).not.toBe(v)
  })

  it('plano.json apunta al SVG y al respaldo con la versión', () => {
    expect(describirPlano('abc1234', 300, 200, config, { ancho: 450, alto: 300 })).toEqual({
      version: 'abc1234',
      ancho: 300,
      alto: 200,
      url: '/data/mapa-base.svg?v=abc1234',
      respaldo: { url: '/data/mapa-base.webp?v=abc1234', escala: 1.5, ancho: 450, alto: 300 },
    })
  })
})
