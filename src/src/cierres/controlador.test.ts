import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { crearControladorCierres } from './controlador.ts'
import { parsearFecha } from './fechas.ts'
import { LUGARES, cierresEjemplo, grafoReal, lugar } from './test/datos.ts'

const grafo = grafoReal()
const consultaEnfermeria = {
  origen: lugar('enfermeria').puertas,
  destino: lugar('aula-101').puertas,
  criterio: 'mas-corta' as const,
}

describe('reevaluación de la vigencia (2.4)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    // 05/11 12:59: la escalera vence a las 13:00; la obra sigue.
    vi.setSystemTime(parsearFecha('2026-11-05T12:59:00-03:00')!)
  })
  afterEach(() => vi.useRealTimers())

  it('un cierre que vence deja de aplicarse en el siguiente cálculo de ruta', () => {
    const c = crearControladorCierres({ grafo, cierres: cierresEjemplo(), lugares: LUGARES })
    const labQuimica = {
      origen: lugar('aula-121').puertas,
      destino: lugar('lab-quimica').puertas,
      criterio: 'mas-corta' as const,
    }
    expect(c.calcularRuta(labQuimica).tipo).toBe('sin-ruta')
    vi.advanceTimersByTime(60_000) // 13:00, sin suscriptores: nadie reevaluó todavía
    expect(c.estado().sinAcceso.has('lab-quimica')).toBe(true)
    expect(c.calcularRuta(labQuimica).tipo).toBe('ruta')
    expect(c.estado().sinAcceso.has('lab-quimica')).toBe(false)
  })

  it('cada 60 s actualiza la capa y los estados de acceso y avisa a los suscriptores', () => {
    const c = crearControladorCierres({ grafo, cierres: cierresEjemplo(), lugares: LUGARES })
    const oyente = vi.fn()
    const desuscribir = c.suscribir(oyente)
    const inicial = c.estado()
    expect(inicial.capa.map((t) => t.cierreId)).toContain('escalera-radio')
    expect(inicial.sinAcceso.has('lab-quimica')).toBe(true)

    vi.advanceTimersByTime(59_999)
    expect(oyente).not.toHaveBeenCalled()
    expect(c.estado()).toBe(inicial)

    vi.advanceTimersByTime(1)
    expect(oyente).toHaveBeenCalledOnce()
    const despues = c.estado()
    expect(despues).not.toBe(inicial)
    expect(despues.capa.map((t) => t.cierreId)).not.toContain('escalera-radio')
    expect(despues.sinAcceso.size).toBe(0)

    vi.advanceTimersByTime(60_000) // sin cambios de vigencia: misma referencia, sin aviso
    expect(oyente).toHaveBeenCalledOnce()
    expect(c.estado()).toBe(despues)

    desuscribir()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('usa el reloj indicado (fecha simulada) y no el del sistema', () => {
    const antes = parsearFecha('2026-11-02T18:00-03:00')!
    const c = crearControladorCierres({
      grafo,
      cierres: cierresEjemplo(),
      lugares: LUGARES,
      reloj: () => antes,
    })
    expect(c.estado().vigentes.map((x) => x.id)).not.toContain('obra-entrada-edificio-sur')
    const r = c.calcularRuta(consultaEnfermeria)
    expect(r.tipo === 'ruta' && r.nodos).toContain('entrada-ed-sur-oeste-sur')
    expect(r.tipo === 'ruta' && r.desvio).toBeNull()
  })

  it('la obra vigente se evita en todo cálculo y lleva aviso de desvío', () => {
    const c = crearControladorCierres({ grafo, cierres: cierresEjemplo(), lugares: LUGARES })
    const r = c.calcularRuta({ ...consultaEnfermeria, criterio: 'resguardada' })
    expect(r.tipo === 'ruta' && r.nodos).not.toContain('entrada-ed-sur-oeste-sur')
    expect(r.tipo === 'ruta' && r.desvio?.texto).toBe(
      'Evitamos un tramo cerrado: Obra en la entrada oeste del Edificio Sur',
    )
    c.detener()
  })
})
