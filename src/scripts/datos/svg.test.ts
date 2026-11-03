import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIR_DATOS_FUENTE, RAIZ } from '../rutas-proyecto.ts'
import {
  elementosDeConstruccion,
  esDeConstruccion,
  leerElementos,
  leerGrafoSvg,
  parsearTransform,
} from './svg.ts'

const svgPrueba = `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#c)">
<rect x="0" y="0" width="100" height="100" fill="#F8F8F8"/>
<path d="M10 10H40V60H10Z" fill="#9ADCFF"/>
<circle cx="50" cy="50" r="2.5" fill="#9ADCFF"/>
<circle cx="60" cy="50" r="2.5" transform="rotate(180 60 50)" fill="#c79aff"/>
<circle class="nodo nodo-cruce" cx="5" cy="5" r="4"/>
</g>
<defs><clipPath id="c"><rect width="5" height="5" fill="#9ADCFF"/></clipPath></defs>
<g id="grafo">
<style>#grafo .nodo{fill:#E30613}</style>
<g id="aristas"><g id="aristas-exteriores">
<line id="arista--a--b" class="arista" x1="10" y1="20" x2="30" y2="20" data-desde="a" data-hasta="b"/>
</g></g>
<g id="nodos">
<circle id="a" class="nodo" cx="10" cy="20" r="4"/>
<circle id="b" class="nodo" cx="30" cy="20" r="4"/>
</g>
</g>
</svg>
`

describe('lectura del SVG', () => {
  it('calcula cajas con transformaciones', () => {
    const [, cuadrado, , rotado] = leerElementos(svgPrueba)
    expect(cuadrado?.caja).toEqual({ x1: 10, y1: 10, x2: 40, y2: 60 })
    expect(rotado?.caja?.x1).toBeCloseTo(57.5)
    expect(parsearTransform('translate(10 20)')).toEqual([1, 0, 0, 1, 10, 20])
  })

  it('anota los grupos con id que contienen a cada forma, del más externo al más interno', () => {
    const elementos = leerElementos(svgPrueba)
    const linea = elementos.find((e) => e.etiqueta === 'line')!
    expect(linea.grupos).toEqual(['grafo', 'aristas', 'aristas-exteriores'])
    expect(elementos.find((e) => e.atributos.id === 'a')?.grupos).toEqual(['grafo', 'nodos'])
    expect(elementos[0]?.grupos).toEqual([])
    expect(elementos.find((e) => e.enDefinicion)?.grupos).toEqual(['c'])
  })
})

describe('grafo dibujado en el plano', () => {
  it('lee los nodos y las aristas del grupo grafo, en orden', () => {
    const { nodos, aristas } = leerGrafoSvg(svgPrueba)
    expect(nodos.map((n) => n.atributos.id)).toEqual(['a', 'b'])
    expect(aristas.map((a) => [a.atributos['data-desde'], a.atributos['data-hasta']])).toEqual([
      ['a', 'b'],
    ])
  })

  it('es de construcción lo que está en el grupo grafo o tiene clase nodo o arista', () => {
    const elementos = leerElementos(svgPrueba).filter((e) => !e.enDefinicion)
    expect(elementos.filter(esDeConstruccion).map((e) => [e.etiqueta, e.atributos.id])).toEqual([
      ['circle', undefined],
      ['line', 'arista--a--b'],
      ['circle', 'a'],
      ['circle', 'b'],
    ])
    // Los puntos celestes y violetas del plano viejo de Figma ya no cuentan como grafo.
    expect(elementosDeConstruccion(svgPrueba)).toHaveLength(4)
  })

  it('mapa-unlam.svg tiene 660 nodos y 690 aristas en el grupo grafo, y el plano base está limpio', () => {
    const { nodos, aristas } = leerGrafoSvg(readFileSync(join(RAIZ, 'mapa-unlam.svg'), 'utf8'))
    expect([nodos.length, aristas.length]).toEqual([660, 690])
    const base = readFileSync(join(DIR_DATOS_FUENTE, 'mapa-base.svg'), 'utf8')
    expect(elementosDeConstruccion(base)).toEqual([])
  })
})
