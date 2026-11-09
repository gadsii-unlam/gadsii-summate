import { describe, expect, it } from 'vitest'
import { CRITERIOS, calcularRuta } from '../rutas/index.ts'
import { calcularRutaConCierres, explicarSinRuta, type ConsultaConCierres } from './rutas.ts'
import { cierre, cierreDeEjemplo, cierresEjemplo, grafoReal, lugar } from './test/datos.ts'
import { tramosDeCierres } from './vigencia.ts'

const grafo = grafoReal()

function consulta(
  origen: string,
  destino: string,
  criterio: ConsultaConCierres['criterio'] = 'mas-corta',
): ConsultaConCierres {
  const o = lugar(origen)
  const d = lugar(destino)
  return {
    origen: o.puertas,
    destino: d.puertas,
    criterio,
    nombreOrigen: o.nombre,
    nombreDestino: d.nombre,
  }
}

const OBRA = cierreDeEjemplo('obra-entrada-edificio-sur')
const ESCALERA = cierreDeEjemplo('escalera-radio')
/** Única arista de la Entrada Florencio Varela (la entrada principal). */
const ARISTA_PRINCIPAL =
  'arista__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste__entrada-campus-florencio-varela'

describe('exclusión de los tramos cerrados (3.1)', () => {
  it('sin cierres, Enfermería → Aula 101 pasa por entrada-ed-sur-oeste-sur (≈ 594 px)', () => {
    const r = calcularRutaConCierres(grafo, consulta('enfermeria', 'aula-101'), [])
    expect(r.tipo).toBe('ruta')
    if (r.tipo !== 'ruta') return
    expect(r.nodos).toContain('entrada-ed-sur-oeste-sur')
    expect(r.distanciaPx).toBeCloseTo(593.75, 2)
    expect(r.desvio).toBeNull()
  })

  it.each(CRITERIOS)(
    'con entrada-ed-sur-oeste-sur cerrado (%s) la ruta no pasa por ese nodo ni sus aristas',
    (criterio) => {
      const r = calcularRutaConCierres(grafo, consulta('enfermeria', 'aula-101', criterio), [OBRA])
      expect(r.tipo).toBe('ruta')
      if (r.tipo !== 'ruta') return
      expect(r.nodos).not.toContain('entrada-ed-sur-oeste-sur')
      expect(r.aristas.some((a) => a.includes('entrada-ed-sur-oeste-sur'))).toBe(false)
      if (criterio === 'mas-corta') {
        expect(r.distanciaPx).toBeCloseTo(1083.57, 2)
        expect(r.distanciaM).toBeCloseTo(195, 0)
      }
    },
  )

  it('cerrar un nodo cierra todas sus aristas: ninguna ruta pasa por escalera-radio-primer-piso', () => {
    const r = calcularRutaConCierres(grafo, consulta('aula-121', 'lab-quimica'), [ESCALERA])
    expect(r.tipo).toBe('sin-ruta')
  })

  it('una arista escrita al revés queda cerrada', () => {
    const vereda = cierreDeEjemplo('vereda-entrada-principal') // escrita al revés en el archivo
    const arista =
      'arista__cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste__cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur'
    expect(vereda.aristas).toEqual([arista])
    const tramo = {
      origen: ['cruce--ext-calle-sur-rectorado--ext-vereda-oeste-edificio-sur'],
      destino: ['cruce--ext-calle-sur-rectorado--ext-franja-entre-edificios-oeste'],
      criterio: 'mas-corta' as const,
    }
    const sin = calcularRutaConCierres(grafo, tramo, [])
    expect(sin.tipo === 'ruta' && sin.aristas).toEqual([arista])
    const con = calcularRutaConCierres(grafo, tramo, [vereda])
    expect(con.tipo).toBe('ruta')
    expect(con.tipo === 'ruta' && con.aristas).not.toContain(arista)
    expect(con.tipo === 'ruta' && con.desvio?.texto).toBe(
      'Evitamos un tramo cerrado: Vereda en reparación frente a la entrada principal',
    )
  })

  it('con una puerta del Gimnasio cerrada entra por la otra (acceso norte)', () => {
    const sin = calcularRutaConCierres(grafo, consulta('aula-121', 'gimnasio'), [])
    expect(sin.tipo === 'ruta' && sin.puertaDestino).toBe('acceso-gimnasio-sur')
    const r = calcularRutaConCierres(grafo, consulta('aula-121', 'gimnasio'), [
      cierre('gim', 'Puerta del Gimnasio cerrada', { nodos: ['acceso-gimnasio-sur'] }),
    ])
    expect(r.tipo === 'ruta' && r.puertaDestino).toBe('acceso-gimnasio-norte')
    expect(r.tipo === 'ruta' && r.distanciaPx).toBeCloseTo(1272.73, 2)
  })
})

describe('motivo de "Sin ruta disponible" (3.3)', () => {
  it('Laboratorio de Química (1er piso) como destino, con la escalera cerrada', () => {
    const r = calcularRutaConCierres(grafo, consulta('aula-121', 'lab-quimica'), [OBRA, ESCALERA])
    expect(r.tipo).toBe('sin-ruta')
    if (r.tipo !== 'sin-ruta') return
    expect(r.sinRuta).toMatchObject({
      titulo: 'Sin ruta disponible',
      lado: 'destino',
      texto:
        'Los accesos a Laboratorio de Química están cerrados: Escalera junto a la Radio cerrada por mantenimiento.',
      motivos: ['Escalera junto a la Radio cerrada por mantenimiento'],
      cierresMas: 0,
      cierres: [
        {
          id: 'escalera-radio',
          motivo: 'Escalera junto a la Radio cerrada por mantenimiento',
        },
      ],
      puertasDestino: ['puerta-lab-quimica'],
    })
    expect(r.sinRuta.acciones.map((a) => a.etiqueta)).toEqual([
      'Elegir otro destino',
      'Volver al mapa',
    ])
  })

  it('Entrada principal aislada como origen', () => {
    const vereda = cierre(
      'vereda-principal',
      'Vereda en reparación frente a la entrada principal',
      {
        aristas: [ARISTA_PRINCIPAL],
      },
    )
    const r = calcularRutaConCierres(
      grafo,
      consulta('entrada-campus-florencio-varela', 'aula-121'),
      [OBRA, vereda],
    )
    expect(r.tipo).toBe('sin-ruta')
    if (r.tipo !== 'sin-ruta') return
    expect(r.sinRuta.lado).toBe('origen')
    expect(r.sinRuta.texto).toBe(
      'Los accesos a Entrada Florencio Varela están cerrados: Vereda en reparación frente a la entrada principal.',
    )
  })

  it('la Entrada principal aislada también se detecta como destino', () => {
    const vereda = cierre('v', 'Vereda en reparación', { aristas: [ARISTA_PRINCIPAL] })
    const r = calcularRutaConCierres(
      grafo,
      consulta('aula-121', 'entrada-campus-florencio-varela'),
      [vereda],
    )
    expect(r.tipo === 'sin-ruta' && r.sinRuta.lado).toBe('destino')
    expect(r.tipo === 'sin-ruta' && r.sinRuta.motivos).toEqual(['Vereda en reparación'])
  })

  it('todas las puertas cerradas: los cierres de esas puertas', () => {
    // Las dos puertas del Gimnasio y un segundo cierre sobre la puerta 2 (se cuenta aparte).
    const gimnasio = [
      ...lugar('gimnasio').puertas.map((p, i) =>
        cierre(`g${i}`, `Puerta ${i + 1} del Gimnasio cerrada`, { nodos: [p] }),
      ),
      cierre('g-pintura', 'Puerta 2 del Gimnasio en pintura', {
        nodos: [lugar('gimnasio').puertas[1]!],
      }),
    ]
    const r = calcularRutaConCierres(grafo, consulta('aula-121', 'gimnasio'), gimnasio)
    expect(r.tipo === 'sin-ruta' && r.motivo).toBe('destino-sin-puertas')
    if (r.tipo !== 'sin-ruta') return
    expect(r.sinRuta.motivos).toEqual([
      'Puerta 1 del Gimnasio cerrada',
      'Puerta 2 del Gimnasio cerrada',
    ])
    expect(r.sinRuta.cierresMas).toBe(1)
    expect(r.sinRuta.texto).toBe(
      'Los accesos a Gimnasio J.M. Fangio están cerrados: Puerta 1 del Gimnasio cerrada, Puerta 2 del Gimnasio cerrada y 1 cierre más.',
    )
  })

  it('sin nombres usa "al destino" y no incluye cierres ajenos al borde', () => {
    const e = explicarSinRuta(
      grafo,
      {
        origen: ['puerta-aula-121'],
        destino: ['puerta-lab-quimica'],
        criterio: 'mas-corta',
      },
      cierresEjemplo(),
    )
    expect(e.texto).toBe(
      'Los accesos al destino están cerrados: Escalera junto a la Radio cerrada por mantenimiento.',
    )
  })
})

describe('aviso de desvío (3.4)', () => {
  it('aparece para Enfermería → Aula 101 con la obra vigente', () => {
    for (const criterio of CRITERIOS) {
      const r = calcularRutaConCierres(
        grafo,
        consulta('enfermeria', 'aula-101', criterio),
        cierresEjemplo(),
      )
      if (criterio === 'resguardada') {
        // La resguardada habitual también pasa por el paso interior.
        expect(r.tipo === 'ruta' && r.desvio?.texto).toBe(
          'Evitamos un tramo cerrado: Obra en la entrada oeste del Edificio Sur',
        )
        continue
      }
      expect(r.tipo === 'ruta' && r.desvio).toEqual({
        texto: 'Evitamos un tramo cerrado: Obra en la entrada oeste del Edificio Sur',
        cierres: [
          { id: 'obra-entrada-edificio-sur', motivo: 'Obra en la entrada oeste del Edificio Sur' },
        ],
      })
    }
  })

  it('no aparece para Aula 121 → Aula 110 aunque haya cierres vigentes', () => {
    const r = calcularRutaConCierres(grafo, consulta('aula-121', 'aula-110'), cierresEjemplo())
    expect(r.tipo).toBe('ruta')
    expect(r.tipo === 'ruta' && r.desvio).toBeNull()
  })

  it('se omite si no hay cierres vigentes', () => {
    const r = calcularRutaConCierres(grafo, consulta('enfermeria', 'aula-101'), [])
    expect(r.tipo === 'ruta' && r.desvio).toBeNull()
  })

  it('varios cierres cruzados se enumeran', () => {
    const habitual = calcularRuta(grafo, consulta('enfermeria', 'aula-101'))
    if (habitual.tipo !== 'ruta') throw new Error('sin ruta')
    // El segundo tramo (la vereda frente al Centro de Copiado) tiene desvío por el otro lado.
    const otro = cierre('otro', 'Vereda frente a Enfermería en pintura', {
      aristas: [habitual.aristas[1]!],
    })
    const r = calcularRutaConCierres(grafo, consulta('enfermeria', 'aula-101'), [OBRA, otro])
    expect(r.tipo).toBe('ruta')
    expect(r.tipo === 'ruta' && r.desvio?.texto).toBe(
      'Evitamos tramos cerrados: Obra en la entrada oeste del Edificio Sur y Vereda frente a Enfermería en pintura',
    )
    expect(tramosDeCierres([OBRA, otro]).aristas.size).toBe(1)
  })
})
