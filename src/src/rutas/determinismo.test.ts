import { describe, expect, it } from 'vitest'
import { calcularRuta } from './astar.ts'
import { prepararGrafoRuteable } from './grafo-ruteable.ts'
import { crearAleatorio, mezclar } from './test/aleatorio.ts'
import { GIMNASIO, GRAFO_CAMPUS, grafoReal } from './test/datos-reales.ts'
import type { ConsultaRuta } from './tipos.ts'

const CONSULTAS: ConsultaRuta[] = [
  // Empate exacto de distancia (dos caminos de 798 px con distinto exterior).
  {
    origen: ['acceso-biblioteca-oeste'],
    destino: ['puerta-auditorio-marti'],
    criterio: 'mas-corta',
  },
  {
    origen: ['puerta-aula-309'],
    destino: ['puerta-aula-103'],
    criterio: 'resguardada',
  },
  { origen: ['puerta-aula-121'], destino: [...GIMNASIO], criterio: 'mas-corta' },
  { origen: ['puerta-aula-309'], destino: ['puerta-aula-332'], criterio: 'mas-corta' },
]

describe('determinismo', () => {
  it('la misma consulta da la misma secuencia de nodos con las aristas en 100 órdenes distintos', () => {
    const base = grafoReal()
    const esperadas = CONSULTAS.map((c) => calcularRuta(base, c))
    const aleatorio = crearAleatorio(2024)
    for (let i = 0; i < 100; i++) {
      const grafo = prepararGrafoRuteable({
        ...GRAFO_CAMPUS,
        nodos: mezclar(GRAFO_CAMPUS.nodos, aleatorio),
        aristas: mezclar(GRAFO_CAMPUS.aristas, aleatorio),
      })
      CONSULTAS.forEach((consulta, j) => {
        expect(calcularRuta(grafo, consulta)).toEqual(esperadas[j])
      })
    }
  })

  it('el orden de las puertas en la consulta no cambia el resultado', () => {
    const grafo = grafoReal()
    const a = calcularRuta(grafo, {
      origen: ['puerta-aula-121'],
      destino: [...GIMNASIO],
      criterio: 'mas-corta',
    })
    const b = calcularRuta(grafo, {
      origen: ['puerta-aula-121'],
      destino: [...GIMNASIO].reverse(),
      criterio: 'mas-corta',
    })
    expect(b).toEqual(a)
  })
})
