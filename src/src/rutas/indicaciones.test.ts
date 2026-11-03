import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  calcularGiro,
  contraer,
  generarIndicaciones,
  type LugarIndicaciones,
} from './indicaciones.ts'
import { camino } from './test/camino.ts'

const lugar = (nombre: string, extra: Partial<LugarIndicaciones> = {}): LugarIndicaciones => ({
  nombre,
  piso: 'PB',
  indicacion: null,
  ...extra,
})
const LUGARES = { origen: lugar('Aula 1'), destino: lugar('Aula 2') }

afterEach(() => {
  vi.restoreAllMocks()
})

describe('giro por producto vectorial (y hacia abajo)', () => {
  it.each([
    ['este', 'norte', 'izquierda'],
    ['norte', 'este', 'derecha'],
    ['este', 'sur', 'derecha'],
    ['sur', 'este', 'izquierda'],
    ['oeste', 'norte', 'derecha'],
    ['norte', 'oeste', 'izquierda'],
    ['oeste', 'sur', 'izquierda'],
    ['sur', 'oeste', 'derecha'],
    ['este', 'este', 'derecho'],
    ['este', 'oeste', 'vuelta'],
    ['norte', 'sur', 'vuelta'],
  ] as const)('de %s a %s → %s', (d1, d2, giro) => {
    expect(calcularGiro(d1, d2)).toBe(giro)
  })
})

describe('pasos de un camino de prueba', () => {
  it('giros a menos de 4 m se combinan con "y enseguida"', () => {
    // Puerta hacia el sur, pasillo al este, a 3 m dobla al norte y enseguida al este.
    const { ruta, datos } = camino([
      { id: 'puerta-a', x: 0, y: 0 },
      { id: 'pasillo-1', x: 0, y: 10 },
      { id: 'pasillo-2', x: 20, y: 10 },
      { id: 'pasillo-3', x: 20, y: 7 },
      { id: 'pasillo-4', x: 40, y: 7 },
      { id: 'puerta-b', x: 40, y: 17 },
    ])
    const pasos = generarIndicaciones(ruta, datos, LUGARES)
    expect(pasos.map((p) => p.texto)).toEqual([
      'Salí de Aula 1 y doblá a la izquierda',
      'Doblá a la izquierda y enseguida a la derecha',
      'Doblá a la derecha: llegaste a Aula 2',
    ])
    expect(pasos.map((p) => p.distanciaM)).toEqual([20, 25, undefined])
    expect(pasos[1]!.giro).toBe('izquierda')
  })

  it('a 4 m o más los giros van en pasos separados', () => {
    const { ruta, datos } = camino([
      { id: 'pasillo-0', x: 0, y: 10 },
      { id: 'pasillo-2', x: 20, y: 10 },
      { id: 'pasillo-3', x: 20, y: 5 },
      { id: 'pasillo-4', x: 40, y: 5 },
    ])
    const pasos = generarIndicaciones(ruta, datos, LUGARES)
    expect(pasos.map((p) => p.texto)).toEqual([
      'Desde Aula 1, seguí la línea azul 20 m',
      'Doblá a la izquierda',
      'Doblá a la derecha',
      'Llegaste a Aula 2',
    ])
  })

  it('un desvío de menos de 3 m entre dos tramos iguales no genera giros', () => {
    const { ruta, datos } = camino([
      { id: 'pasillo-0', x: 0, y: 10 },
      { id: 'pasillo-1', x: 20, y: 10 },
      { id: 'pasillo-2', x: 20, y: 8.5 },
      { id: 'pasillo-3', x: 40, y: 8.5 },
    ])
    const pasos = generarIndicaciones(ruta, datos, LUGARES)
    expect(pasos.map((p) => p.texto)).toEqual([
      'Desde Aula 1, seguí la línea azul 40 m',
      'Llegaste a Aula 2',
    ])
    expect(pasos[0]!.distanciaEnTexto).toBe(true)
  })

  it('un tramo de 0 px (dos puntos en el mismo lugar) no genera giros', () => {
    const { ruta, datos } = camino([
      { id: 'puerta-a', x: 0, y: 0 },
      { id: 'pasillo-1', x: 0, y: 10 },
      { id: 'pasillo-2', x: 0, y: 30 },
      { id: 'pasillo-3', x: 0, y: 30 },
      { id: 'pasillo-4', x: 0, y: 50 },
      { id: 'puerta-b', x: 10, y: 50 },
    ])
    const pasos = generarIndicaciones(ruta, datos, LUGARES)
    expect(pasos.map((p) => p.texto)).toEqual([
      'Salí de Aula 1',
      'Doblá a la izquierda: llegaste a Aula 2',
    ])
  })

  it('el giro en U se escribe "Volvé sobre tus pasos" y se registra en consola', () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const { ruta, datos } = camino([
      { id: 'pasillo-0', x: 0, y: 0 },
      { id: 'pasillo-1', x: 20, y: 0 },
      { id: 'pasillo-2', x: 10, y: 0 },
      { id: 'pasillo-3', x: 10, y: 20 },
    ])
    const pasos = generarIndicaciones(ruta, datos, LUGARES)
    expect(pasos.map((p) => p.texto)).toEqual([
      'Desde Aula 1, seguí la línea azul 20 m',
      'Volvé sobre tus pasos',
      'Doblá a la izquierda',
      'Llegaste a Aula 2',
    ])
    expect(aviso).toHaveBeenCalledTimes(1)
    expect(String(aviso.mock.calls[0]![0])).toContain('pasillo-1')
  })

  it.each([
    // Llega hacia el norte y la puerta queda al oeste: izquierda.
    ['norte', -10, 'Doblá a la izquierda: llegaste a Aula 2', 'izquierda'],
    // Llega hacia el norte y la puerta queda al este: derecha.
    ['norte', 10, 'Doblá a la derecha: llegaste a Aula 2', 'derecha'],
    // La puerta queda al frente.
    ['norte', 0, 'Seguí derecho: llegaste a Aula 2', undefined],
  ] as const)('llegada hacia el %s con la puerta a dx=%s → %s', (_, dx, texto, giro) => {
    const { ruta, datos } = camino([
      { id: 'pasillo-0', x: 0, y: 100 },
      { id: 'pasillo-1', x: 0, y: 50 },
      { id: 'puerta-b', x: dx, y: dx === 0 ? 40 : 50 },
    ])
    const pasos = generarIndicaciones(ruta, datos, LUGARES)
    const llegada = pasos.at(-1)!
    expect(llegada).toMatchObject({ tipo: 'llegar', texto, alAireLibre: false })
    expect(llegada.distanciaM).toBeUndefined()
    expect(llegada.giro).toBe(giro)
  })

  it('salir y entrar de un edificio, con y sin nombre de entrada, y cambio de edificio bajo techo', () => {
    const { ruta, datos } = camino(
      [
        { id: 'puerta-a', x: 0, y: 0, depto: 'edificio-oeste' },
        { id: 'pasillo-1', x: 0, y: 10, depto: 'edificio-oeste' },
        { id: 'entrada-ed-oeste-1', x: 30, y: 10, depto: 'edificio-oeste' },
        { id: 'pasillo-c', x: 60, y: 10, depto: 'central' },
        { id: 'entrada-ed-este-1', x: 60, y: 40, depto: 'edificio-este' },
        { id: 'pasillo-s', x: 60, y: 60, depto: 'edificio-este' },
        { id: 'pasillo-d', x: 90, y: 60, depto: 'primer-piso' },
        { id: 'puerta-b', x: 90, y: 70, depto: 'primer-piso' },
      ],
      [2, 3],
      { 'entrada-ed-oeste-1': 'entrada este del pasillo norte' },
    )
    const pasos = generarIndicaciones(ruta, datos, LUGARES)
    expect(pasos.map((p) => [p.tipo, p.texto, p.alAireLibre])).toEqual([
      ['salir-lugar', 'Salí de Aula 1 y doblá a la izquierda', false],
      [
        'salir-edificio',
        'Seguí derecho y salí del Edificio Oeste por la entrada este del pasillo norte',
        true,
      ],
      ['girar', 'Doblá a la derecha', true],
      ['entrar-edificio', 'Entrá al Edificio Este', false],
      [
        'cambiar-edificio',
        'Doblá a la izquierda y seguí por el pasillo hasta la galería del 1er piso',
        false,
      ],
      ['llegar', 'Doblá a la derecha: llegaste a Aula 2', false],
    ])
  })

  it('una puerta que da a la vereda: "Salí de … a la vereda" y "Llegaste a …"', () => {
    const { ruta, datos } = camino(
      [
        { id: 'puerta-a', x: 0, y: 0, depto: 'servicios' },
        { id: 'pasillo-1', x: 0, y: 10, depto: 'central' },
        { id: 'pasillo-2', x: 0, y: 40, depto: 'central' },
        { id: 'puerta-b', x: 10, y: 40, depto: 'servicios' },
      ],
      [0, 1, 2],
    )
    const pasos = generarIndicaciones(ruta, datos, {
      origen: lugar('Biblioteca'),
      destino: lugar('Teatro'),
    })
    expect(pasos.map((p) => p.texto)).toEqual([
      'Salí de Biblioteca a la vereda',
      'Llegaste a Teatro',
    ])
    expect(pasos[0]!.alAireLibre).toBe(true)
  })
})

describe('contracciones con el nombre del edificio', () => {
  it.each([
    ['a', 'el Edificio Este', 'al Edificio Este'],
    ['de', 'el Edificio Sur', 'del Edificio Sur'],
    ['a', 'la galería del 1er piso', 'a la galería del 1er piso'],
    ['de', 'Biblioteca', 'de Biblioteca'],
    ['a', 'elefantes', 'a elefantes'],
  ] as const)('%s + "%s" → "%s"', (preposicion, nombre, texto) => {
    expect(contraer(preposicion, nombre)).toBe(texto)
  })
})

describe('escaleras entre pisos', () => {
  it('una escalera hacia arriba es un paso propio y la llegada es al lugar (sin paso de piso)', () => {
    const { ruta, datos } = camino([
      { id: 'puerta-a', x: 0, y: 0 },
      { id: 'pasillo-1', x: 0, y: 10 },
      { id: 'pasillo-2', x: 30, y: 10 },
      { id: 'pasillo-3', x: 30, y: -20, piso: 1 },
      { id: 'puerta-b', x: 40, y: -20, piso: 1 },
    ])
    const pasos = generarIndicaciones(ruta, datos, {
      origen: lugar('Aula 1'),
      destino: lugar('Laboratorio de Química', { piso: '1' }),
    })
    expect(pasos.map((p) => [p.tipo, p.texto, p.distanciaM])).toEqual([
      ['salir-lugar', 'Salí de Aula 1 y doblá a la izquierda', 30],
      ['escalera', 'Doblá a la izquierda y subí la escalera al 1er piso', 30],
      ['llegar', 'Doblá a la derecha: llegaste a Laboratorio de Química', undefined],
    ])
    expect(pasos[1]!.giro).toBe('izquierda')
  })

  it('una escalera hacia abajo dice "bajá la escalera a planta baja"', () => {
    const { ruta, datos } = camino([
      { id: 'puerta-a', x: 40, y: -20, piso: 1 },
      { id: 'pasillo-3', x: 30, y: -20, piso: 1 },
      { id: 'pasillo-2', x: 30, y: 10 },
      { id: 'pasillo-1', x: 0, y: 10 },
      { id: 'puerta-b', x: 0, y: 0 },
    ])
    const pasos = generarIndicaciones(ruta, datos, {
      origen: lugar('Laboratorio de Química', { piso: '1' }),
      destino: lugar('Aula 1'),
    })
    expect(pasos.map((p) => [p.tipo, p.texto])).toEqual([
      [
        'salir-lugar',
        'Salí de Laboratorio de Química, doblá a la izquierda, y bajá la escalera a planta baja',
      ],
      ['girar', 'Doblá a la derecha'],
      ['llegar', 'Doblá a la derecha: llegaste a Aula 1'],
    ])
  })
})

describe('destinos en otros pisos', () => {
  const recorrido = () =>
    camino([
      { id: 'puerta-a', x: 0, y: 0 },
      { id: 'pasillo-1', x: 0, y: 10 },
      { id: 'pasillo-2', x: 30, y: 10 },
      { id: 'puerta-escalera', x: 30, y: 20 },
    ])

  it('agrega un paso final con el piso y la indicación cargada tal cual', () => {
    const { ruta, datos } = recorrido()
    const indicacion = 'Subí por la escalera frente al Aula 121; el aula está a la derecha.'
    const pasos = generarIndicaciones(ruta, datos, {
      origen: lugar('Aula 1'),
      destino: lugar('Aula 210', { piso: '1', indicacion }),
    })
    expect(pasos.at(-2)!.tipo).toBe('llegar')
    expect(pasos.at(-2)!.texto).toBe('Doblá a la derecha: llegaste al acceso de planta baja')
    const piso = pasos.at(-1)!
    expect(piso.tipo).toBe('piso')
    expect(piso.texto).toBe(`1er piso: ${indicacion}`)
    expect(piso.texto).toContain(indicacion)
    expect(piso.distanciaM).toBeUndefined()
  })

  it('sin indicación cargada solo dice el piso (no inventa escaleras)', () => {
    const { ruta, datos } = recorrido()
    const pasos = generarIndicaciones(ruta, datos, {
      origen: lugar('Aula 1'),
      destino: lugar('Aula 310', { piso: '2' }),
    })
    expect(pasos.at(-1)).toMatchObject({ tipo: 'piso', texto: 'El lugar está en el 2do piso' })
  })

  it('un destino de planta baja no tiene paso de piso', () => {
    const { ruta, datos } = recorrido()
    const pasos = generarIndicaciones(ruta, datos, LUGARES)
    expect(pasos.some((p) => p.tipo === 'piso')).toBe(false)
    expect(pasos.at(-1)!.tipo).toBe('llegar')
  })
})
