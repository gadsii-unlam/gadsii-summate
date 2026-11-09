import { describe, expect, it } from 'vitest'
import { calcularRuta } from './astar.ts'
import { armarTramos, direccionDe, indexarNodos, partesDeRuta, puntosEntre } from './tramos.ts'
import { ARISTA_DIAGONAL, GRAFO_CAMPUS, grafoReal } from './test/datos-reales.ts'
import type { RutaEncontrada } from './tipos.ts'

const grafo = grafoReal()
const info = indexarNodos(GRAFO_CAMPUS.nodos)

function ruta(
  origen: string,
  destino: string,
  criterio: 'mas-corta' | 'resguardada' = 'mas-corta',
) {
  const r = calcularRuta(grafo, { origen: [origen], destino: [destino], criterio })
  if (r.tipo !== 'ruta') throw new Error(r.tipo)
  return r as RutaEncontrada
}

describe('tramos', () => {
  it('dirección por el eje dominante, con el norte arriba', () => {
    expect(direccionDe([0, 0], [10, 0.5])).toBe('este')
    expect(direccionDe([0, 0], [-10, 0])).toBe('oeste')
    expect(direccionDe([0, 0], [0, -10])).toBe('norte')
    expect(direccionDe([0, 0], [0.4, 10])).toBe('sur')
  })

  it('Dir. de Alumnos → Dto. de Salud: dirección, metros, exterior y departamentos de cada tramo', () => {
    const r = ruta('puerta-direccion-alumnos', 'puerta-dpto-cs-salud')
    const tramos = armarTramos(r, grafo, info)
    expect(tramos).toHaveLength(r.nodos.length - 1)
    expect(tramos[0]).toMatchObject({
      desde: 'puerta-direccion-alumnos',
      hasta: 'pasillo-frente-direccion-alumnos',
      direccion: 'sur',
      exterior: false,
      deptoDesde: 'edificio-oeste',
      tipoDesde: 'puerta',
      pisoDesde: 0,
      pisoHasta: 0,
    })
    expect(tramos[5]).toMatchObject({
      desde: 'entrada-ed-oeste-auditorios-lado-este',
      direccion: 'este',
      exterior: true,
      deptoDesde: 'edificio-oeste',
      deptoHasta: 'central',
      tipoDesde: 'entrada',
    })
    const total = tramos.reduce((s, t) => s + t.longitudM, 0)
    expect(total).toBeCloseTo(r.distanciaM, 0)
  })

  it('la ruta más corta del ejemplo tiene 57 m al aire libre en una sola parte, entre las entradas de los dos edificios', () => {
    const r = ruta('puerta-direccion-alumnos', 'puerta-dpto-cs-salud')
    const partes = partesDeRuta(armarTramos(r, grafo, info))
    expect(partes.map((p) => p.exterior)).toEqual([false, true, false])
    const afuera = partes[1]!
    expect(r.nodos[afuera.desde]).toBe('entrada-ed-oeste-auditorios-lado-este')
    expect(r.nodos[afuera.hasta]).toBe('entrada-ed-este-kinesiologia')
    expect(Math.round(afuera.longitudM)).toBe(57)
    expect(afuera.longitudM).toBeCloseTo(r.exteriorM, 0)
    // Las partes se tocan: el último punto de una es el primero de la siguiente.
    expect(partes[0]!.puntos.at(-1)).toEqual(afuera.puntos[0])
    expect(afuera.puntos.at(-1)).toEqual(partes[2]!.puntos[0])
    // Y juntas recorren la misma polilínea que el A*.
    const juntas = partes.flatMap((p, i) => (i === 0 ? p.puntos : p.puntos.slice(1)))
    expect(juntas.filter((p, i) => i === 0 || p.join() !== juntas[i - 1]!.join())).toEqual(
      r.polilinea.filter((p, i) => i === 0 || p.join() !== r.polilinea[i - 1]!.join()),
    )
  })

  it('una ruta toda bajo techo es una sola parte continua', () => {
    const r = ruta('puerta-aula-121', 'puerta-aula-110')
    const partes = partesDeRuta(armarTramos(r, grafo, info))
    expect(partes).toHaveLength(1)
    expect(partes[0]!.exterior).toBe(false)
  })

  it('puntosEntre devuelve el tramo pedido de la polilínea', () => {
    const r = ruta('puerta-direccion-alumnos', 'puerta-dpto-cs-salud')
    const tramos = armarTramos(r, grafo, info)
    const puntos = puntosEntre(tramos, 1, 4)
    const n = (id: string) => grafo.nodos[grafo.indiceNodo.get(id)!]!
    const desde = n('pasillo-frente-direccion-alumnos')
    const hasta = n('cruce--oeste-hall-auditorios--oeste-pasillo-lateral-este')
    expect(puntos[0]).toEqual([desde.x, desde.y])
    expect(puntos.at(-1)).toEqual([hasta.x, hasta.y])
    expect(puntos).toHaveLength(4)
  })

  it('el tramo diagonal mide la distancia euclídea y toma la dirección del eje más largo', () => {
    const r = ruta('entrada-campus-florencio-varela', 'puerta-aula-101')
    const tramos = armarTramos(r, grafo, info)
    const diagonal = tramos.find((t) => r.aristas[t.nodo] === ARISTA_DIAGONAL)!
    // (838, 3482) → (1033, 3355): Δx = 195, Δy = −127.
    expect(diagonal.longitudPx).toBeCloseTo(Math.hypot(195, 127), 6)
    expect(diagonal.direccion).toBe('este')
    expect(diagonal.longitudM).toBeCloseTo(diagonal.longitudPx * grafo.metrosPorPx, 6)
  })

  it('el tramo de la escalera une dos pisos', () => {
    const r = ruta('puerta-aula-121', 'puerta-lab-quimica')
    const tramos = armarTramos(r, grafo, info)
    const escalera = tramos.filter((t) => t.pisoDesde !== t.pisoHasta)
    expect(escalera).toHaveLength(1)
    expect(escalera[0]).toMatchObject({
      desde: 'escalera-radio-planta-baja',
      hasta: 'escalera-radio-primer-piso',
      pisoDesde: 0,
      pisoHasta: 1,
    })
    expect(tramos.at(-1)).toMatchObject({ hasta: 'puerta-lab-quimica', pisoHasta: 1 })
  })
})
