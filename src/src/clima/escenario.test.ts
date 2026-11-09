import { describe, expect, it, vi } from 'vitest'
import {
  CLAVE_ESCENARIO_CLIMA,
  crearControlEscenario,
  pidePanelDePrueba,
  resolverEscenario,
  type AlmacenSesion,
} from './escenario.ts'

/** `sessionStorage` en memoria: una instancia = una pestaña. */
function pestana(
  inicial: Record<string, string> = {},
): AlmacenSesion & { datos: Map<string, string> } {
  const datos = new Map(Object.entries(inicial))
  return {
    datos,
    getItem: (k) => datos.get(k) ?? null,
    setItem: (k, v) => void datos.set(k, v),
  }
}

const roto: AlmacenSesion = {
  getItem: () => {
    throw new Error('SecurityError')
  },
  setItem: () => {
    throw new Error('QuotaExceededError')
  },
}

describe('resolución del escenario', () => {
  it('sin parámetro ni sesión: seco', () => {
    expect(resolverEscenario('', pestana())).toBe('seco')
  })

  it('el parámetro de la dirección gana sobre la sesión y se guarda', () => {
    const s = pestana({ [CLAVE_ESCENARIO_CLIMA]: 'seco' })
    expect(resolverEscenario('?clima=lluvia', s)).toBe('lluvia')
    expect(s.datos.get(CLAVE_ESCENARIO_CLIMA)).toBe('lluvia')
  })

  it('sin parámetro se usa lo guardado en la sesión', () => {
    expect(resolverEscenario('?x=1', pestana({ [CLAVE_ESCENARIO_CLIMA]: 'error' }))).toBe('error')
  })

  it('un valor desconocido se ignora: queda lo guardado o seco', () => {
    expect(resolverEscenario('?clima=nieve', pestana({ [CLAVE_ESCENARIO_CLIMA]: 'lento' }))).toBe(
      'lento',
    )
    expect(resolverEscenario('?clima=nieve', pestana())).toBe('seco')
  })

  it('un valor guardado inválido se ignora', () => {
    expect(resolverEscenario('', pestana({ [CLAVE_ESCENARIO_CLIMA]: 'granizo' }))).toBe('seco')
  })

  it('con sessionStorage bloqueado no falla', () => {
    expect(resolverEscenario('', roto)).toBe('seco')
    expect(resolverEscenario('?clima=lluvia', roto)).toBe('lluvia')
    expect(resolverEscenario('', null)).toBe('seco')
  })

  it('recarga: lo elegido desde el panel sigue activo sin parámetros', () => {
    const tab = pestana()
    crearControlEscenario({ busqueda: '', almacen: tab }).elegir('lluvia')
    expect(crearControlEscenario({ busqueda: '', almacen: tab }).actual()).toBe('lluvia')
  })

  it('pestaña nueva: vuelve a seco', () => {
    crearControlEscenario({ busqueda: '', almacen: pestana() }).elegir('lluvia')
    expect(crearControlEscenario({ busqueda: '', almacen: pestana() }).actual()).toBe('seco')
  })

  it('`?panel=prueba` pide el panel', () => {
    expect(pidePanelDePrueba('?panel=prueba&clima=seco')).toBe(true)
    expect(pidePanelDePrueba('?panel=otro')).toBe(false)
  })
})

describe('control del escenario', () => {
  it('avisa los cambios y no avisa si se elige el mismo', () => {
    const c = crearControlEscenario({ busqueda: '', almacen: pestana() })
    const alCambiar = vi.fn()
    const salir = c.suscribir(alCambiar)
    c.elegir('seco')
    expect(alCambiar).not.toHaveBeenCalled()
    c.elegir('lluvia')
    expect(alCambiar).toHaveBeenCalledWith('lluvia')
    salir()
    c.elegir('error')
    expect(alCambiar).toHaveBeenCalledTimes(1)
    expect(c.actual()).toBe('error')
  })

  it('con sessionStorage bloqueado recuerda en memoria', () => {
    const c = crearControlEscenario({ busqueda: '', almacen: roto })
    c.elegir('lento')
    expect(c.actual()).toBe('lento')
  })
})
