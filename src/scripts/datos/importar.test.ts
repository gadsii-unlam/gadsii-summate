import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DIR_DATOS_FUENTE, RAIZ } from '../rutas-proyecto.ts'
import { importarGrafo, salaDePuerta } from './importar.ts'
import { elementosDeConstruccion, quitarGrafo, soloGrafo } from './svg.ts'

const plano = (
  grafo: string,
) => `<svg width="300" height="200" viewBox="0 0 300 200" xmlns="http://www.w3.org/2000/svg">
<rect width="300" height="200" fill="#FFD27C"/>
<g id="grafo">
<style>#grafo .nodo{fill:red}</style>
${grafo}
</g>
</svg>
`

const nodo = (id: string, extra: string) =>
  `<circle id="${id}" class="nodo" cx="10" cy="20" r="4" ${extra}/>`

const PRUEBA = plano(`<g id="aristas">
<g id="aristas-interiores">
<line class="arista" x1="10" y1="20" x2="10" y2="20" data-desde="puerta-aula-1" data-hasta="pasillo-frente-aula-1" data-distancia="5"/>
</g>
<g id="aristas-exteriores">
<line class="arista" x1="10" y1="20" x2="10" y2="20" data-desde="entrada-ed-sur-norte" data-hasta="cruce-ext" data-distancia="12.5"/>
</g>
<g id="aristas-escaleras">
<line class="arista" x1="10" y1="20" x2="10" y2="20" data-desde="escalera-pb" data-hasta="escalera-p1" data-distancia="3"/>
</g>
</g>
<g id="nodos">
${nodo('puerta-aula-1', 'data-tipo="aula" data-ambito="interior" data-piso="0" data-edificio="edificio-sur" data-nombre="Aula 1"')}
${nodo('pasillo-frente-aula-1', 'data-tipo="frente-puerta" data-ambito="interior" data-piso="0" data-edificio="edificio-sur" data-nombre="Pasillo frente a Aula 1"')}
${nodo('entrada-ed-sur-norte', 'data-tipo="entrada" data-ambito="entrada" data-piso="0" data-nombre="Entrada edificio sur (norte)"')}
${nodo('cruce-ext', 'data-tipo="cruce" data-ambito="exterior" data-piso="0" data-nombre="Cruce"')}
${nodo('acceso-buffet', 'data-tipo="acceso-lugar" data-ambito="interior" data-piso="0" data-edificio="edificio-oeste" data-nombre="Buffet (acceso)"')}
${nodo('puerta-canchas', 'data-tipo="lugar" data-ambito="primer-piso" data-piso="1" data-nombre="Canchas (1er piso)"')}
${nodo('escalera-pb', 'data-tipo="escalera" data-ambito="escalera" data-piso="0" data-nombre="Escalera (PB)"')}
${nodo('escalera-p1', 'data-tipo="escalera" data-ambito="escalera" data-piso="1" data-nombre="Escalera (1er piso)"')}
</g>`)

describe('importarGrafo', () => {
  const { grafo, problemas } = importarGrafo(PRUEBA)
  const porId = new Map(grafo!.nodos.map((n) => [n.id, n]))

  it('lee el tamaño del plano y todos los nodos y aristas, sin problemas', () => {
    expect(problemas).toEqual([])
    expect([grafo!.ancho, grafo!.alto]).toEqual([300, 200])
    expect(grafo!.nodos).toHaveLength(8)
    expect(grafo!.aristas).toHaveLength(3)
  })

  it('traduce tipo, depto y piso', () => {
    const resumen = (id: string) => {
      const n = porId.get(id)!
      return [n.tipo, n.depto, n.piso]
    }
    expect(resumen('puerta-aula-1')).toEqual(['puerta', 'edificio-sur', 0])
    expect(resumen('pasillo-frente-aula-1')).toEqual(['pasillo', 'edificio-sur', 0])
    // Las entradas de edificio toman el edificio de su id.
    expect(resumen('entrada-ed-sur-norte')).toEqual(['entrada', 'edificio-sur', 0])
    expect(resumen('cruce-ext')).toEqual(['pasillo', 'central', 0])
    expect(resumen('acceso-buffet')).toEqual(['puerta', 'edificio-oeste', 0])
    expect(resumen('puerta-canchas')).toEqual(['puerta', 'primer-piso', 1])
    // Cada extremo de la escalera es del piso al que llega.
    expect(resumen('escalera-pb')).toEqual(['pasillo', 'central', 0])
    expect(resumen('escalera-p1')).toEqual(['pasillo', 'primer-piso', 1])
  })

  it('el nombre va solo en puertas y entradas, sin "(acceso)" ni "(1er piso)"; la categoría, si el plano la dice', () => {
    expect(porId.get('puerta-aula-1')).toMatchObject({ nombre: 'Aula 1', categoria: 'aula' })
    expect(porId.get('acceso-buffet')!.nombre).toBe('Buffet')
    expect(porId.get('puerta-canchas')!.nombre).toBe('Canchas')
    expect(porId.get('entrada-ed-sur-norte')!.nombre).toBe('Entrada edificio sur (norte)')
    expect(porId.get('pasillo-frente-aula-1')!.nombre).toBeUndefined()
    expect(porId.get('acceso-buffet')!.categoria).toBeUndefined()
  })

  it('arma el id de cada arista y marca exterior las de aristas-exteriores y la escalera', () => {
    expect(grafo!.aristas).toEqual([
      {
        id: 'arista__puerta-aula-1__pasillo-frente-aula-1',
        a: 'puerta-aula-1',
        b: 'pasillo-frente-aula-1',
        exterior: false,
        peso: 5,
      },
      {
        id: 'arista__entrada-ed-sur-norte__cruce-ext',
        a: 'entrada-ed-sur-norte',
        b: 'cruce-ext',
        exterior: true,
        peso: 12.5,
      },
      {
        id: 'arista__escalera-pb__escalera-p1',
        a: 'escalera-pb',
        b: 'escalera-p1',
        exterior: true,
        peso: 3,
      },
    ])
  })

  it('un data-tipo desconocido o un nodo interior sin edificio frenan la importación', () => {
    const malo = plano(
      `${nodo('x', 'data-tipo="ascensor" data-ambito="interior" data-piso="0" data-edificio="edificio-sur"')}
${nodo('y', 'data-tipo="aula" data-ambito="interior" data-piso="0"')}`,
    )
    const r = importarGrafo(malo)
    expect(r.grafo).toBeNull()
    expect(r.problemas.map((p) => p.ids)).toEqual([['x'], ['y']])
  })

  it('un plano sin el grupo grafo no importa nada', () => {
    const r = importarGrafo('<svg width="10" height="10"><rect width="10" height="10"/></svg>')
    expect(r.grafo).toBeNull()
    expect(r.problemas.map((p) => p.tipo)).toEqual(['importar-plano'])
  })
})

describe('quitarGrafo y soloGrafo', () => {
  it('quitarGrafo saca el grupo entero (con los <g> anidados y los estilos) y deja el resto', () => {
    const base = quitarGrafo(PRUEBA)
    expect(base).not.toContain('id="grafo"')
    expect(base).not.toContain('<style>')
    expect(base).toContain('<rect width="300" height="200" fill="#FFD27C"/>')
    expect(base.trimEnd().endsWith('</svg>')).toBe(true)
    expect(elementosDeConstruccion(base)).toEqual([])
    expect(elementosDeConstruccion(PRUEBA).length).toBe(11)
  })

  it('sin grupo grafo, quitarGrafo no cambia nada', () => {
    const svg = '<svg width="10" height="10"><rect width="10" height="10"/></svg>'
    expect(quitarGrafo(svg)).toBe(svg)
  })

  it('soloGrafo deja la raíz y el grupo grafo', () => {
    const solo = soloGrafo(PRUEBA)
    expect(solo.startsWith('<svg width="300" height="200" viewBox="0 0 300 200"')).toBe(true)
    expect(solo).not.toContain('#FFD27C"/>')
    expect(importarGrafo(solo).grafo).toEqual(importarGrafo(PRUEBA).grafo)
  })
})

describe('con el plano real (mapa-unlam.svg)', () => {
  const svg = readFileSync(join(RAIZ, 'mapa-unlam.svg'), 'utf8')

  it('importa exactamente datos-fuente/grafo.json (si falla, correr npm run datos:importar)', () => {
    const { grafo, problemas } = importarGrafo(svg)
    expect(problemas).toEqual([])
    const guardado = JSON.parse(
      readFileSync(join(DIR_DATOS_FUENTE, 'grafo.json'), 'utf8'),
    ) as unknown
    expect(grafo).toEqual(guardado)
  })

  it('datos-fuente/mapa-base.svg es el plano sin el grafo y está limpio', () => {
    const base = readFileSync(join(DIR_DATOS_FUENTE, 'mapa-base.svg'), 'utf8')
    expect(base).toBe(quitarGrafo(svg))
    expect(elementosDeConstruccion(base)).toEqual([])
  })
})

describe('salaDePuerta', () => {
  const sala = {
    contorno: [
      [0, 0],
      [50, 0],
      [50, 40],
      [0, 40],
    ] as [number, number][],
    area: 2000,
  }
  const edificio = {
    contorno: [
      [-100, -100],
      [200, -100],
      [200, 200],
      [-100, 200],
    ] as [number, number][],
    area: 90000,
  }

  it('toma la forma más chica detrás de la puerta, del lado opuesto al pasillo', () => {
    // Puerta en la pared de abajo de la sala; el pasillo está más abajo.
    expect(salaDePuerta({ x: 25, y: 40 }, { x: 25, y: 60 }, [edificio, sala])).toEqual(
      sala.contorno,
    )
    // Del otro lado de la misma pared no está la sala.
    expect(salaDePuerta({ x: 25, y: 40 }, { x: 25, y: 20 }, [sala])).toBeNull()
  })

  it('sin pasillo distinto de la puerta no hay dirección: null', () => {
    expect(salaDePuerta({ x: 25, y: 40 }, { x: 25, y: 40 }, [sala])).toBeNull()
  })

  it('en el plano real 289 de las 291 puertas tienen sala', () => {
    const { grafo } = importarGrafo(readFileSync(join(RAIZ, 'mapa-unlam.svg'), 'utf8'))
    const puertas = grafo!.nodos.filter((n) => n.tipo === 'puerta')
    expect(puertas.filter((n) => n.sala)).toHaveLength(289)
    // La del Aula 121: el rectángulo crema de 93,58 × 37,07 px detrás de su puerta.
    const aula = puertas.find((n) => n.id === 'puerta-aula-121')!.sala!
    const xs = aula.map((p) => p[0])
    const ys = aula.map((p) => p[1])
    expect([Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]).toEqual([
      1531.79, 3082.56, 1625.37, 3119.63,
    ])
  })
})
