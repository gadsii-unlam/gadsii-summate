import { describe, expect, it } from 'vitest'
import { LUGARES_DE_PRUEBA, lugar } from '../test/catalogoDePrueba.ts'
import { buscar, crearIndice } from './indice.ts'
import { normalizar, normalizarConsulta } from './normalizar.ts'
import { agregarReciente, esListaRecientes, recientesConocidos } from './recientes.ts'

describe('normalizar', () => {
  it.each([
    ['Lab. de Física', 'lab de fisica'],
    ['BIBLIOTÉCA', 'biblioteca'],
    ['Martí', 'marti'],
    ['Año Ñandú', 'ano nandu'],
    ['  Dto.  Cs.   Económicas ', 'dto cs economicas'],
    ['Labs. A y B', 'labs a y b'],
    ['Lab-de_física/(2)', 'lab de fisica 2'],
    ['', ''],
  ])('%j → %j', (entrada, esperado) => {
    expect(normalizar(entrada)).toBe(esperado)
  })

  it.each([
    ['aula 121', '121'],
    ['Aula 121', '121'],
    ['AULA   302', '302'],
    ['aula', 'aula'],
    ['aula magna', 'aula magna'],
  ])('consulta %j → %j', (entrada, esperado) => {
    expect(normalizarConsulta(entrada)).toBe(esperado)
  })
})

const indice = crearIndice(LUGARES_DE_PRUEBA)
const nombres = (texto: string) => buscar(indice, texto).map((r) => r.lugar.nombre)

describe('buscar: tildes, mayúsculas y puntuación', () => {
  it('"microscopia" encuentra "Lab. de Microscopía"', () => {
    expect(nombres('microscopia')).toContain('Lab. de Microscopía')
  })
  it('"MICROSCOPÍA" encuentra lo mismo que "microscopia"', () => {
    expect(nombres('MICROSCOPÍA')).toEqual(nombres('microscopia'))
  })
  it('"BIBLIOTÉCA" encuentra "Biblioteca"', () => {
    expect(nombres('BIBLIOTÉCA')).toContain('Biblioteca')
  })
  it('"lab fis" encuentra "Lab. de Física"', () => {
    expect(nombres('lab fis')).toContain('Lab. de Física')
  })
  it('"zzz" no encuentra nada y la consulta vacía tampoco', () => {
    expect(nombres('zzz')).toEqual([])
    expect(nombres('   ')).toEqual([])
  })
})

describe('buscar: número de aula', () => {
  it('"121" → el primer resultado es "Aula 121"', () => {
    expect(nombres('121')[0]).toBe('Aula 121')
  })
  it('"aula 302" → el primer resultado es "Aula 302"', () => {
    expect(nombres('aula 302')[0]).toBe('Aula 302')
  })
  it('"12" → las aulas 120 a 129 en orden numérico', () => {
    const r = nombres('12')
    expect(r.slice(0, 10)).toEqual(Array.from({ length: 10 }, (_, i) => `Aula 12${i}`))
  })
})

describe('buscar: alias y edificio', () => {
  it('"cantina" encuentra el Buffet por alias', () => {
    const r = buscar(indice, 'cantina')
    expect(r.map((x) => x.lugar.nombre)).toContain('Buffet')
    expect(r.find((x) => x.lugar.nombre === 'Buffet')?.nivel).toBe(4)
  })
  it('"humanidades" devuelve los lugares del edificio, como el Aula 121', () => {
    const r = buscar(indice, 'humanidades')
    expect(r.map((x) => x.lugar.nombre)).toContain('Aula 121')
    expect(r.every((x) => x.lugar.edificio === 'Humanidades')).toBe(true)
  })
})

describe('buscar: departamento', () => {
  it('"derecho" encuentra las aulas del departamento aunque el edificio no se llame así', () => {
    const aula = lugar('edificio-este-401', 'Aula 401', 'Edificio Este', 'aula', {
      departamento: 'Derecho y Ciencia Política',
    })
    const otra = lugar('edificio-este-601', 'Aula 601', 'Edificio Este', 'aula', {
      departamento: 'Ciencias de la Salud',
    })
    const r = buscar(crearIndice([aula, otra]), 'derecho')
    expect(r.map((x) => x.lugar.nombre)).toEqual(['Aula 401'])
  })
})

describe('buscar: orden', () => {
  it('"salud": los nombres que empiezan con Salud van antes que el resto del edificio', () => {
    const r = buscar(indice, 'salud')
    expect(r[0]?.lugar.nombre).toBe('Salud Mental')
    const deEdificio = r.findIndex((x) => x.lugar.nombre === 'Aula 401')
    const porPalabra = r.findIndex((x) => x.lugar.nombre === 'Dto. de Salud')
    expect(porPalabra).toBeGreaterThan(0)
    expect(deEdificio).toBeGreaterThan(porPalabra)
  })
  it('a igual nivel, "Aula 2" va antes que "Aula 10"', () => {
    const r = nombres('humanidades')
    expect(r.indexOf('Aula 2')).toBeLessThan(r.indexOf('Aula 10'))
  })
  it('la misma consulta da el mismo orden', () => {
    expect(nombres('aula')).toEqual(nombres('aula'))
  })
  it('subcadena del nombre de 3 caracteres o más (nivel 6)', () => {
    const r = buscar(indice, 'scopia')
    expect(r[0]?.lugar.nombre).toBe('Lab. de Microscopía')
    expect(r[0]?.nivel).toBe(6)
    expect(buscar(indice, 'co').some((x) => x.nivel === 6)).toBe(false)
  })
  it('el estado de acceso no interviene: el orden depende solo del catálogo', () => {
    // Buscar no recibe el estado de acceso, así que un lugar sin acceso conserva su lugar.
    expect(nombres('12')[1]).toBe('Aula 121')
  })
  it('como máximo 50 resultados', () => {
    const muchos = Array.from({ length: 120 }, (_, i) => lugar(`x-${i}`, `Aula ${i}`, 'X'))
    expect(buscar(crearIndice(muchos), 'aula')).toHaveLength(50)
  })
})

describe('buscar: resaltado', () => {
  it('resalta la parte del nombre visible que coincide', () => {
    const r = buscar(indice, 'lab fis').find((x) => x.lugar.nombre === 'Lab. de Física')
    const partes = r?.resaltado.map(([a, b]) => 'Lab. de Física'.slice(a, b))
    expect(partes).toEqual(['Lab', 'Fís'])
  })
  it('resalta con tildes en el original', () => {
    const r = buscar(indice, 'marti')[0]
    expect(r?.resaltado.map(([a, b]) => r.lugar.nombre.slice(a, b))).toEqual(['Martí'])
  })
})

describe('buscar: rendimiento', () => {
  it('buscar sobre 300 lugares tarda menos de 5 ms', () => {
    const lugares = Array.from({ length: 300 }, (_, i) =>
      lugar(
        `e${i % 7}-${i}`,
        i % 3 ? `Aula ${i}` : `Lab. de Algo ${i}`,
        `Edificio ${i % 7}`,
        'aula',
        {
          alias: [`alias ${i}`],
        },
      ),
    )
    const idx = crearIndice(lugares)
    for (const q of ['a', 'lab', '12']) buscar(idx, q) // calentar
    const consultas = ['1', '12', '121', 'aula 2', 'lab al', 'edificio 3', 'alias', 'zzz', 'go 1']
    const inicio = performance.now()
    for (const q of consultas) buscar(idx, q)
    const porConsulta = (performance.now() - inicio) / consultas.length
    expect(porConsulta).toBeLessThan(5)
  })
})

describe('recientes', () => {
  it('agrega adelante, sin repetidos y con máximo 8', () => {
    let lista = agregarReciente([], 'a', 1)
    lista = agregarReciente(lista, 'b', 2)
    lista = agregarReciente(lista, 'a', 3)
    expect(lista.map((r) => r.id)).toEqual(['a', 'b'])
    for (let i = 0; i < 20; i++) lista = agregarReciente(lista, `x${i}`, 10 + i)
    expect(lista).toHaveLength(8)
    expect(lista[0]?.id).toBe('x19')
  })
  it('descarta los ids que ya no están en el catálogo', () => {
    const lista = [
      { id: 'a', cuando: 2 },
      { id: 'viejo', cuando: 1 },
    ]
    expect(recientesConocidos(lista, (id) => id === 'a')).toEqual([{ id: 'a', cuando: 2 }])
  })
  it('valida lo leído del almacenamiento', () => {
    expect(esListaRecientes([{ id: 'a', cuando: 1 }])).toBe(true)
    expect(esListaRecientes([{ id: 1 }])).toBe(false)
    expect(esListaRecientes('a')).toBe(false)
  })
})
