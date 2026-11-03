import { describe, expect, it } from 'vitest'
import type { GrafoCampus, NodoCampus } from '../../src/datos/tipos.ts'
import type { GrafoFuente, LugaresCurados } from './fuentes.ts'
import { leerConfig, leerCurados, leerDepartamentos, leerGrafoFuente } from './fuentes.ts'
import { enriquecerGrafo, leerEstructura } from './grafo.ts'
import {
  agruparPuertas,
  armarCatalogo,
  asignarDepartamentos,
  huecosDeNumeracion,
} from './lugares.ts'
import { categoriaPorReglas, derivarNombre } from './nombres.ts'
import { errores } from './problemas.ts'

const config = leerConfig()
const curadosReales = leerCurados()
const fuenteReal = leerEstructura(leerGrafoFuente()).grafo as GrafoFuente
const grafoReal = enriquecerGrafo(fuenteReal, config.metrosPorPx).grafo
/** El catálogo como lo arma el pipeline: con los nombres y categorías del plano. */
const catalogoReal = (curados: LugaresCurados) =>
  armarCatalogo(grafoReal, curados, fuenteReal.nodos)

const sinCuracion = (): LugaresCurados => ({
  edificios: {},
  lugares: {},
  referencias: [],
  otrosPisos: [],
  pendientes: [],
  exteriorForzado: {},
})
const puerta = (id: string, depto: string): Pick<NodoCampus, 'id' | 'depto'> => ({ id, depto })

/** Grafo chico de prueba (no hace falta que sea conexo: el catálogo no lo revisa). */
function grafoChico(nodos: [string, string, number, number][]): GrafoCampus {
  return {
    version: 'prueba',
    metrosPorPx: 0.35,
    ancho: 100,
    alto: 100,
    nodos: nodos.map(([id, depto, x, y]) => ({
      id,
      depto,
      x,
      y,
      tipo: id.split('-')[0] as NodoCampus['tipo'],
    })),
    aristas: [],
  }
}

describe('agrupación de puertas', () => {
  it('Gimnasio tiene 3 puertas, la principal primero', () => {
    const { grupos } = agruparPuertas([
      puerta('puerta-servicios-gimnasio-3', 'servicios'),
      puerta('puerta-servicios-gimnasio', 'servicios'),
      puerta('puerta-servicios-gimnasio-2', 'servicios'),
    ])
    expect(grupos).toEqual([
      {
        id: 'servicios-gimnasio',
        depto: 'servicios',
        base: 'gimnasio',
        puertas: [
          'puerta-servicios-gimnasio',
          'puerta-servicios-gimnasio-2',
          'puerta-servicios-gimnasio-3',
        ],
      },
    ])
  })

  it('estudio-2 es un lugar propio si no existe estudio', () => {
    const { grupos, problemas } = agruparPuertas([
      puerta('puerta-artes-y-medios-estudio-2', 'artes-y-medios'),
    ])
    expect(grupos.map((g) => g.id)).toEqual(['artes-y-medios-estudio-2'])
    expect(problemas).toEqual([])
  })

  it('230-3 forma el Aula 230 con aviso de sufijo sin puerta base', () => {
    const { grupos, problemas } = agruparPuertas([
      puerta('puerta-formacion-continua-230-3', 'formacion-continua'),
    ])
    expect(grupos.map((g) => [g.id, g.base])).toEqual([['formacion-continua-230', '230']])
    expect(problemas.map((p) => [p.tipo, p.ids])).toEqual([
      ['puerta-sufijo-sin-base', ['puerta-formacion-continua-230-3']],
    ])
  })

  it('saca sufijos encadenados (sector-administrativo-2-2)', () => {
    const { grupos } = agruparPuertas(
      ['', '-2', '-2-2'].map((s) =>
        puerta(`puerta-artes-y-medios-sector-administrativo${s}`, 'artes-y-medios'),
      ),
    )
    expect(grupos).toHaveLength(1)
    expect(grupos[0]?.puertas).toHaveLength(3)
  })

  it('la agrupación a mano pisa la automática', () => {
    const g = grafoChico([
      ['puerta-derecho-lab-1', 'derecho', 10, 10],
      ['puerta-derecho-lab-2', 'derecho', 20, 10],
    ])
    const curados = {
      ...sinCuracion(),
      lugares: {
        'derecho-labs': {
          nombre: 'Labs. 1 y 2',
          puertas: ['puerta-derecho-lab-1', 'puerta-derecho-lab-2'],
        },
      },
    }
    const { catalogo } = armarCatalogo(g, curados)
    expect(catalogo.lugares.map((l) => [l.id, l.nombre, l.puertas.length])).toEqual([
      ['derecho-labs', 'Labs. 1 y 2', 2],
    ])
  })

  it('con ids sin departamento, el lugar es el id sin `puerta-` ni `acceso-`', () => {
    const { grupos, problemas } = agruparPuertas([
      puerta('puerta-aula-121', 'edificio-sur'),
      puerta('acceso-buffet', 'edificio-oeste'),
      puerta('patio-aulas-250', 'central'),
      puerta('puerta-lab-planta-baja-2', 'edificio-este'),
    ])
    expect(grupos.map((g) => [g.id, g.base, g.puertas])).toEqual([
      ['aula-121', 'aula-121', ['puerta-aula-121']],
      ['buffet', 'buffet', ['acceso-buffet']],
      ['patio-aulas-250', 'patio-aulas-250', ['patio-aulas-250']],
      // `-2` no es sufijo de puerta: no existe puerta-lab-planta-baja ni es un número de aula.
      ['lab-planta-baja-2', 'lab-planta-baja-2', ['puerta-lab-planta-baja-2']],
    ])
    expect(problemas).toEqual([])
  })

  it('con ids sin departamento, -2 agrupa con la puerta base del mismo prefijo', () => {
    const { grupos } = agruparPuertas([
      puerta('puerta-aula-130-2', 'edificio-sur'),
      puerta('puerta-aula-130', 'edificio-sur'),
    ])
    expect(grupos).toEqual([
      {
        id: 'aula-130',
        depto: 'edificio-sur',
        base: 'aula-130',
        puertas: ['puerta-aula-130', 'puerta-aula-130-2'],
      },
    ])
  })

  it('con el grafo real cada una de las 291 puertas es un lugar (las de varias puertas se curan)', () => {
    const { grupos, problemas } = agruparPuertas(grafoReal.nodos.filter((n) => n.tipo === 'puerta'))
    expect(grupos).toHaveLength(291)
    expect(grupos.filter((g) => g.puertas.length > 1)).toEqual([])
    expect(problemas).toEqual([])
  })
})

describe('nombres', () => {
  it('derivados del id: aulas numeradas (con y sin `aula-`) y palabras del diccionario', () => {
    expect(derivarNombre('121')).toBe('Aula 121')
    expect(derivarNombre('aula-121')).toBe('Aula 121')
    expect(derivarNombre('lab-microscopia')).toBe('Lab. Microscopía')
  })

  it('sin los nombres del plano, el nombre se deriva del id', () => {
    const { catalogo } = armarCatalogo(grafoReal, sinCuracion())
    expect(catalogo.lugares.find((l) => l.id === 'aula-121')).toMatchObject({
      nombre: 'Aula 121',
      nombreCurado: false,
    })
    expect(catalogo.lugares.find((l) => l.id === 'buffet')?.nombre).toBe('Buffet')
    expect(catalogo.lugares.every((l) => !l.nombreCurado)).toBe(true)
  })

  it('con el plano, los 295 lugares (291 puertas y 4 entradas al campus) usan su nombre', () => {
    const { catalogo, problemas } = catalogoReal(sinCuracion())
    expect(catalogo.lugares).toHaveLength(295)
    expect(catalogo.lugares.filter((l) => !l.nombreCurado)).toEqual([])
    expect(problemas.find((p) => p.tipo === 'nombre-derivado')?.ids).toEqual([])
    const nombre = (id: string) => catalogo.lugares.find((l) => l.id === id)?.nombre
    expect(nombre('aula-121')).toBe('Aula 121')
    expect(nombre('lab-microscopia')).toBe('Lab. de Microscopía')
    expect(nombre('entrada-campus-la-paz')).toBe('Entrada campus La Paz')
    // El importador saca las aclaraciones "(acceso)" y "(1er piso)".
    expect(nombre('salon-americas')).toBe('Salón de las Américas')
    expect(nombre('canchas-voley')).toBe('Canchas de Vóley')
    expect(nombre('acceso-biblioteca-este')).toBeUndefined()
    expect(nombre('biblioteca-este')).toBe('Biblioteca Leopoldo Marechal (acceso este)')
  })
})

describe('edificio y categoría', () => {
  const { catalogo } = catalogoReal(curadosReales)
  const lugar = (id: string) => catalogo.lugares.find((l) => l.id === id)

  it('categorías por reglas', () => {
    expect(
      ['121', 'lab-1', 'banos', 'buffet', 'teatro', 'rectorado'].map(categoriaPorReglas),
    ).toEqual(['aula', 'laboratorio', 'bano', 'servicio', 'auditorio', 'oficina'])
    expect(
      [
        'aula-121',
        'laboratorios-medios',
        'bano-hombres-tesoreria',
        'canchas-voley',
        'microestadio-futsal',
        'tesoreria',
        'aula-magna',
        'salon-americas',
        'adunlam',
      ].map(categoriaPorReglas),
    ).toEqual([
      'aula',
      'laboratorio',
      'bano',
      'servicio',
      'servicio',
      'servicio',
      'auditorio',
      'auditorio',
      'oficina',
    ])
  })

  it('totales por categoría con el grafo real', () => {
    const totales: Record<string, number> = {}
    for (const l of catalogo.lugares) totales[l.categoria] = (totales[l.categoria] ?? 0) + 1
    expect(totales).toEqual({
      aula: 213,
      laboratorio: 18,
      bano: 17,
      servicio: 17,
      auditorio: 5,
      oficina: 17,
      entrada: 4,
    })
  })

  it('el edificio sale del departamento (exterior: Campus; 1er piso: la galería)', () => {
    expect(lugar('aula-320')?.edificio).toBe('Edificio Oeste')
    expect(lugar('aula-401')?.edificio).toBe('Edificio Este')
    expect(lugar('aula-121')?.edificio).toBe('Edificio Sur')
    expect(lugar('teatro')?.edificio).toBe('Campus')
    expect(lugar('lab-quimica')?.edificio).toBe('Galería del 1er piso')
  })

  it('un departamento sin nombre curado usa el id y se reporta', () => {
    const r = catalogoReal(sinCuracion())
    expect(r.catalogo.lugares.find((l) => l.id === 'aula-320')?.edificio).toBe('Edificio oeste')
    expect(r.problemas.filter((p) => p.tipo === 'edificio-sin-nombre').length).toBeGreaterThan(0)
  })

  it('la categoría del plano pisa la de las reglas, y la curada pisa a las dos', () => {
    const g = grafoChico([['puerta-sala-de-simulacion', 'edificio-este', 10, 10]])
    const fuente = [
      {
        id: 'puerta-sala-de-simulacion',
        nombre: 'Sala de Simulación',
        categoria: 'laboratorio' as const,
      },
    ]
    const categoria = (curados: LugaresCurados, f = fuente) =>
      armarCatalogo(g, curados, f).catalogo.lugares[0]?.categoria
    expect(categoria(sinCuracion(), [])).toBe('oficina')
    expect(categoria(sinCuracion())).toBe('laboratorio')
    expect(
      categoria({
        ...sinCuracion(),
        lugares: { 'sala-de-simulacion': { categoria: 'servicio' } },
      }),
    ).toBe('servicio')
  })
})

describe('entradas, referencias, alias, piso y caja', () => {
  const { catalogo } = catalogoReal(curadosReales)
  const lugar = (id: string) => catalogo.lugares.find((l) => l.id === id)

  it('las 4 entradas al campus son lugares de categoría entrada y referencias', () => {
    const entradas = catalogo.lugares.filter((l) => l.categoria === 'entrada')
    expect(entradas.map((l) => l.id).sort()).toEqual([
      'entrada-campus-florencio-varela',
      'entrada-campus-la-paz',
      'entrada-campus-peron-norte',
      'entrada-campus-peron-sur',
    ])
    expect(lugar('entrada-campus-florencio-varela')?.nombre).toBe('Entrada Florencio Varela')
    expect(
      entradas.every((l) => l.referencia && l.puertas.length === 1 && l.puertas[0] === l.id),
    ).toBe(true)
  })

  it('hay 10 referencias, entre ellas la Biblioteca', () => {
    expect(catalogo.lugares.filter((l) => l.referencia)).toHaveLength(10)
    expect(lugar('biblioteca')?.referencia).toBe(true)
  })

  it('el número de aula es alias y el piso por defecto es PB', () => {
    expect(lugar('aula-232')?.alias).toContain('232')
    expect(lugar('aula-121')).toMatchObject({
      piso: 'PB',
      indicacion: null,
      puertas: ['puerta-aula-121'],
    })
  })

  it('los 12 lugares de la galería son del 1er piso, sin indicación (la ruta sube la escalera)', () => {
    const arriba = catalogo.lugares.filter((l) => l.piso !== 'PB')
    expect(arriba).toHaveLength(12)
    expect(arriba.every((l) => l.piso === '1' && l.depto === 'primer-piso')).toBe(true)
    expect(arriba.every((l) => l.indicacion === null)).toBe(true)
    expect(lugar('lab-quimica')?.puertas).toEqual(['puerta-lab-quimica'])
  })

  it('los lugares de varias puertas son los curados, con la primera como principal', () => {
    const varias = catalogo.lugares.filter((l) => l.puertas.length > 1)
    expect(Object.fromEntries(varias.map((l) => [l.id, l.puertas]))).toEqual({
      biblioteca: ['acceso-biblioteca-oeste', 'acceso-biblioteca-este'],
      gimnasio: ['acceso-gimnasio-norte', 'acceso-gimnasio-sur'],
      'lab-habilidades-clinicas': [
        'puerta-lab-habilidades-clinicas-puerta-1',
        'puerta-lab-habilidades-clinicas-puerta-2',
      ],
      rectorado: ['puerta-rectorado-interior', 'puerta-rectorado-exterior'],
    })
    // Las puertas curadas ya no forman su propio lugar.
    expect(lugar('biblioteca-este')).toBeUndefined()
    expect(lugar('rectorado-interior')).toBeUndefined()
  })

  it('la caja del Gimnasio contiene sus dos puertas', () => {
    const gimnasio = lugar('gimnasio')!
    expect(gimnasio.puertas).toHaveLength(2)
    for (const id of gimnasio.puertas) {
      const n = grafoReal.nodos.find((x) => x.id === id)!
      expect(n.x).toBeGreaterThanOrEqual(gimnasio.caja.x1)
      expect(n.x).toBeLessThanOrEqual(gimnasio.caja.x2)
      expect(n.y).toBeGreaterThanOrEqual(gimnasio.caja.y1)
      expect(n.y).toBeLessThanOrEqual(gimnasio.caja.y2)
    }
  })
})

describe('fusión con lugares-curados.json', () => {
  const g = grafoChico([
    ['puerta-humanidades-banos-mujeres', 'humanidades', 10, 10],
    ['pasillo-humanidades-01', 'humanidades', 20, 10],
    ['puerta-economicas-dir-de-alumnos', 'economicas', 30, 10],
  ])

  it('un nombre curado pisa al derivado y los alias se suman', () => {
    const curados = {
      ...sinCuracion(),
      lugares: {
        'humanidades-banos-mujeres': { nombre: 'Baños de mujeres' },
        'economicas-dir-de-alumnos': { alias: ['Dirección de Alumnos'] },
      },
    }
    const { catalogo } = armarCatalogo(g, curados)
    expect(catalogo.lugares.find((l) => l.id === 'humanidades-banos-mujeres')).toMatchObject({
      nombre: 'Baños de mujeres',
      nombreCurado: true,
    })
    expect(catalogo.lugares.find((l) => l.id === 'economicas-dir-de-alumnos')).toMatchObject({
      nombre: 'Dir. de Alumnos',
      alias: ['Dirección de Alumnos'],
      nombreCurado: false,
    })
  })

  const otroPiso = {
    id: 'humanidades-201',
    nombre: 'Aula 201',
    depto: 'humanidades',
    piso: '1' as const,
    accesos: ['pasillo-humanidades-01'],
    indicacion: 'Subí por la escalera frente al 113.',
  }

  it('un lugar de otro piso verificado entra con piso, indicación y accesos de PB', () => {
    const curados = {
      ...sinCuracion(),
      edificios: { humanidades: 'Humanidades' },
      otrosPisos: [{ ...otroPiso, verificado: true }],
    }
    const { catalogo } = armarCatalogo(g, curados)
    expect(catalogo.lugares.find((l) => l.id === 'humanidades-201')).toMatchObject({
      piso: '1',
      indicacion: otroPiso.indicacion,
      puertas: ['pasillo-humanidades-01'],
      edificio: 'Humanidades',
      categoria: 'aula',
      alias: ['201'],
    })
  })

  it('un lugar de otro piso sin verificar no aparece y queda en el reporte', () => {
    const curados = { ...sinCuracion(), otrosPisos: [{ ...otroPiso, verificado: false }] }
    const { catalogo, problemas } = armarCatalogo(g, curados)
    expect(catalogo.lugares.find((l) => l.id === 'humanidades-201')).toBeUndefined()
    expect(problemas.find((p) => p.tipo === 'otro-piso-sin-verificar')?.ids).toEqual([
      'humanidades-201',
    ])
  })

  it('un acceso inexistente es un error que nombra el lugar y el nodo', () => {
    const curados = {
      ...sinCuracion(),
      otrosPisos: [{ ...otroPiso, accesos: ['pasillo-humanidades-99'], verificado: true }],
    }
    const fallas = errores(armarCatalogo(g, curados).problemas)
    expect(fallas.map((p) => p.ids)).toEqual([['humanidades-201', 'pasillo-humanidades-99']])
    expect(fallas[0]?.mensaje).toContain('pasillo-humanidades-99')
  })

  it('una puerta curada inexistente también es un error', () => {
    const curados = {
      ...sinCuracion(),
      lugares: { 'humanidades-x': { puertas: ['puerta-humanidades-nada'] } },
    }
    expect(errores(armarCatalogo(g, curados).problemas).map((p) => p.tipo)).toEqual([
      'lugar-puerta-inexistente',
    ])
  })
})

describe('avisos del catálogo', () => {
  it('curación sin lugar, nombre repetido en un edificio y pendientes, sin errores', () => {
    const g = grafoChico([
      ['puerta-humanidades-banos', 'humanidades', 10, 10],
      ['puerta-humanidades-sala', 'humanidades', 20, 10],
    ])
    const curados = {
      ...sinCuracion(),
      edificios: { humanidades: 'Humanidades' },
      lugares: {
        'humanidades-999': { nombre: 'Aula fantasma' },
        'humanidades-sala': { nombre: 'Baños' },
      },
      pendientes: [{ depto: 'economicas', lugar: '340', nota: 'Sin punto de puerta' }],
    }
    const { problemas } = armarCatalogo(g, curados)
    expect(errores(problemas)).toEqual([])
    expect(problemas.find((p) => p.tipo === 'curacion-sin-lugar')?.ids).toEqual(['humanidades-999'])
    expect(problemas.find((p) => p.tipo === 'nombre-repetido')?.ids).toEqual([
      'humanidades-banos',
      'humanidades-sala',
    ])
    expect(problemas.find((p) => p.tipo === 'lugar-pendiente')?.mensaje).toContain('340')
  })

  it('huecos de numeración de un solo número', () => {
    expect(huecosDeNumeracion([1, 2, 4, 5, 8, 10])).toEqual([3, 9])
  })

  it('con el grafo real los huecos son 10, 205 y 264', () => {
    const { problemas } = catalogoReal(curadosReales)
    expect(problemas.find((p) => p.tipo === 'hueco-numeracion')?.ids).toEqual(['10', '205', '264'])
    expect(problemas.filter((p) => p.tipo === 'lugar-pendiente')).toHaveLength(
      curadosReales.pendientes.length,
    )
    expect(problemas.filter((p) => p.tipo === 'puerta-sufijo-sin-base')).toEqual([])
    expect(errores(problemas)).toEqual([])
    // Sin avisos de curación: todo lo curado corresponde a un lugar.
    expect(problemas.filter((p) => p.severidad === 'aviso').map((p) => p.tipo)).toEqual([
      'hueco-numeracion',
    ])
  })
})

describe('catálogo real', () => {
  it('tiene 291 lugares y todas sus puertas existen en el grafo', () => {
    const { catalogo } = catalogoReal(curadosReales)
    expect(catalogo.lugares).toHaveLength(291)
    const ids = new Set(grafoReal.nodos.map((n) => n.id))
    expect(catalogo.lugares.flatMap((l) => l.puertas).filter((p) => !ids.has(p))).toEqual([])
    expect(new Set(catalogo.lugares.map((l) => l.id)).size).toBe(291)
    expect(catalogo.versionGrafo).toBe(grafoReal.version)
  })
})

describe('departamentos y salas', () => {
  const departamentos = leerDepartamentos()!
  const { catalogo, problemas } = armarCatalogo(
    grafoReal,
    curadosReales,
    fuenteReal.nodos,
    departamentos,
  )
  const porId = new Map(catalogo.lugares.map((l) => [l.id, l]))

  it('con las fuentes reales todas las aulas tienen departamento, sin errores', () => {
    expect(errores(problemas)).toEqual([])
    expect(problemas.filter((p) => p.tipo === 'aula-sin-departamento')).toEqual([])
    expect(catalogo.lugares.filter((l) => l.departamento !== null)).toHaveLength(240)
  })

  it('el departamento sale del número de aula o del id del lugar', () => {
    expect(porId.get('aula-401')!.departamento).toBe('Derecho y Ciencia Política')
    expect(porId.get('aula-121')!.departamento).toBe('Humanidades y Ciencias Sociales')
    expect(porId.get('aula-5')!.departamento).toBe('Arquitectura')
    expect(porId.get('lab-microscopia')!.departamento).toBe('Derecho y Ciencia Política')
    expect(porId.get('direccion-alumnos')!.departamento).toBe('Ciencias Económicas')
    // Los servicios y los baños no tienen departamento.
    expect(porId.get('biblioteca')!.departamento).toBeNull()
    expect(porId.get('bano-hombres-tesoreria')!.departamento).toBeNull()
  })

  it('la sala es la de la puerta principal, salvo los lugares de sinSala', () => {
    expect(catalogo.lugares.filter((l) => l.sala !== null)).toHaveLength(284)
    expect(porId.get('aula-121')!.sala).toEqual(
      fuenteReal.nodos.find((n) => n.id === 'puerta-aula-121')!.sala,
    )
    expect(curadosReales.sinSala).toContain('dpto-derecho')
    expect(porId.get('dpto-derecho')!.sala).toBeNull()
    expect(porId.get('entrada-campus-la-paz')!.sala).toBeNull()
  })

  it('un aula en dos departamentos o un departamento sin nombre son errores', () => {
    const lugares = structuredClone(catalogo.lugares)
    const ps = asignarDepartamentos(lugares, {
      nombres: { a: 'A' },
      aulas: { a: [121], b: [121] },
      lugares: {},
    })
    expect(
      errores(ps)
        .map((p) => p.tipo)
        .sort(),
    ).toEqual(['departamento-aula-repetida', 'departamento-sin-nombre'])
  })

  it('las aulas que quedan sin departamento y los ids desconocidos se avisan', () => {
    const lugares = structuredClone(catalogo.lugares)
    const ps = asignarDepartamentos(lugares, {
      nombres: { h: 'Humanidades' },
      aulas: { h: [121] },
      lugares: { 'no-existe': 'h' },
    })
    expect(errores(ps)).toEqual([])
    expect(ps.find((p) => p.tipo === 'aula-sin-departamento')!.ids).toHaveLength(212)
    expect(ps.find((p) => p.tipo === 'curacion-sin-lugar')!.ids).toEqual(['no-existe'])
    expect(lugares.find((l) => l.id === 'aula-121')!.departamento).toBe('Humanidades')
  })
})
