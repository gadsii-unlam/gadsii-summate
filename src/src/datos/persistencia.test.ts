import { describe, expect, it } from 'vitest'
import {
  CLAVE_RECORRIDO,
  MENSAJE_RECORRIDO_PERDIDO,
  VIGENCIA_RECORRIDO_MS,
  borrarRecorrido,
  decidirRestauracion,
  guardarRecorrido,
  leerRecorrido,
  versionDatos,
  type RecorridoAGuardar,
} from './persistencia.ts'

class StorageEnMemoria {
  datos = new Map<string, string>()
  getItem(k: string) {
    return this.datos.get(k) ?? null
  }
  setItem(k: string, v: string) {
    this.datos.set(k, v)
  }
  removeItem(k: string) {
    this.datos.delete(k)
  }
}

const storageQueLanza = {
  getItem(): string | null {
    throw new DOMException('bloqueado', 'SecurityError')
  },
  setItem(): void {
    throw new DOMException('cuota', 'QuotaExceededError')
  },
  removeItem(): void {
    throw new DOMException('bloqueado', 'SecurityError')
  },
}

const VERSION = 'abc1234.def5678'
const T0 = new Date('2026-10-22T13:40:00-03:00')
const despues = (ms: number) => () => new Date(T0.getTime() + ms)

const RECORRIDO: RecorridoAGuardar = {
  versionDatos: VERSION,
  origen: 'economicas-dir-de-alumnos',
  destino: 'salud-dto-de-salud',
  alternativaMostrada: 'resguardada',
  rutas: [
    { criterio: 'mas-corta', nodos: ['puerta-a', 'pasillo-b', 'puerta-c'] },
    { criterio: 'resguardada', nodos: ['puerta-a', 'pasillo-d', 'puerta-c'] },
  ],
  climaUsado: 'error',
  criterioElegido: 'resguardada',
}

describe('guardar y leer', () => {
  it('lee lo que guardó, con esquema y fecha', () => {
    const storage = new StorageEnMemoria()
    expect(guardarRecorrido(RECORRIDO, { storage, ahora: () => T0 })).toBe(true)
    const leido = leerRecorrido({ storage, ahora: despues(20 * 60 * 1000) })
    expect(leido).toEqual({ ...RECORRIDO, esquema: 1, guardadoEn: T0.toISOString() })
  })

  it('usa la clave dq:recorrido:v1 y pesa menos de 5 KB', () => {
    const storage = new StorageEnMemoria()
    guardarRecorrido(
      { ...RECORRIDO, rutas: [{ criterio: 'mas-corta', nodos: Array(120).fill('pasillo-x-01') }] },
      { storage, ahora: () => T0 },
    )
    expect([...storage.datos.keys()]).toEqual([CLAVE_RECORRIDO])
    expect(storage.datos.get(CLAVE_RECORRIDO)?.length).toBeLessThan(5000)
  })

  it('guarda sin rutas (destino elegido, todavía sin ruta)', () => {
    const storage = new StorageEnMemoria()
    guardarRecorrido(
      {
        versionDatos: VERSION,
        destino: 'salud-dto-de-salud',
        alternativaMostrada: 'mas-corta',
        rutas: [],
        climaUsado: 'seco',
      },
      { storage, ahora: () => T0 },
    )
    expect(leerRecorrido({ storage, ahora: () => T0 })?.destino).toBe('salud-dto-de-salud')
  })

  it('borrar deja la clave vacía', () => {
    const storage = new StorageEnMemoria()
    guardarRecorrido(RECORRIDO, { storage, ahora: () => T0 })
    borrarRecorrido({ storage })
    expect(storage.getItem(CLAVE_RECORRIDO)).toBeNull()
    expect(leerRecorrido({ storage, ahora: () => T0 })).toBeNull()
  })

  it('vence a las 2 horas y se borra', () => {
    const storage = new StorageEnMemoria()
    guardarRecorrido(RECORRIDO, { storage, ahora: () => T0 })
    expect(leerRecorrido({ storage, ahora: despues(VIGENCIA_RECORRIDO_MS) })).not.toBeNull()
    expect(leerRecorrido({ storage, ahora: despues(3 * 60 * 60 * 1000) })).toBeNull()
    expect(storage.getItem(CLAVE_RECORRIDO)).toBeNull()
  })
})

describe('datos inválidos', () => {
  it('descarta el JSON roto sin lanzar', () => {
    const storage = new StorageEnMemoria()
    storage.setItem(CLAVE_RECORRIDO, '{"esquema":1,')
    expect(leerRecorrido({ storage, ahora: () => T0 })).toBeNull()
    expect(storage.getItem(CLAVE_RECORRIDO)).toBeNull()
  })

  it('descarta un esquema desconocido', () => {
    const storage = new StorageEnMemoria()
    storage.setItem(
      CLAVE_RECORRIDO,
      JSON.stringify({ ...RECORRIDO, esquema: 2, guardadoEn: T0.toISOString() }),
    )
    expect(leerRecorrido({ storage, ahora: () => T0 })).toBeNull()
  })

  it.each([
    ['alternativa desconocida', { alternativaMostrada: 'rapida' }],
    ['rutas que no son lista', { rutas: 'x' }],
    ['nodos que no son texto', { rutas: [{ criterio: 'mas-corta', nodos: [1, 2] }] }],
    ['clima desconocido', { climaUsado: 'nublado' }],
    ['fecha inválida', { guardadoEn: 'ayer' }],
    ['sin versionDatos', { versionDatos: undefined }],
  ])('descarta %s', (_, cambio) => {
    const storage = new StorageEnMemoria()
    storage.setItem(
      CLAVE_RECORRIDO,
      JSON.stringify({ ...RECORRIDO, esquema: 1, guardadoEn: T0.toISOString(), ...cambio }),
    )
    expect(leerRecorrido({ storage, ahora: () => T0 })).toBeNull()
  })
})

describe('localStorage que lanza excepciones', () => {
  it('guardar, leer, borrar y decidir no lanzan', () => {
    const opciones = { storage: storageQueLanza, ahora: () => T0 }
    expect(guardarRecorrido(RECORRIDO, opciones)).toBe(false)
    expect(leerRecorrido(opciones)).toBeNull()
    expect(() => borrarRecorrido(opciones)).not.toThrow()
    expect(
      decidirRestauracion({ ...opciones, versionDatos: VERSION, existeLugar: () => true }),
    ).toEqual({ tipo: 'ninguna' })
  })

  it('sin almacenamiento disponible tampoco lanza', () => {
    expect(guardarRecorrido(RECORRIDO, { storage: null })).toBe(false)
    expect(leerRecorrido({ storage: null })).toBeNull()
  })

  it('con el valor por defecto en Node (sin window) no lanza', () => {
    expect(leerRecorrido()).toBeNull()
  })
})

describe('decidirRestauracion', () => {
  const guardado = () => {
    const storage = new StorageEnMemoria()
    guardarRecorrido(RECORRIDO, { storage, ahora: () => T0 })
    return storage
  }

  it('sin nada guardado: ninguna', () => {
    expect(
      decidirRestauracion({
        storage: new StorageEnMemoria(),
        versionDatos: VERSION,
        existeLugar: () => true,
      }),
    ).toEqual({ tipo: 'ninguna' })
  })

  it('misma versión y dentro de las 2 horas: restaurar sin recalcular', () => {
    const r = decidirRestauracion({
      storage: guardado(),
      ahora: despues(20 * 60 * 1000),
      versionDatos: VERSION,
      existeLugar: () => true,
    })
    expect(r.tipo).toBe('restaurar')
    if (r.tipo === 'restaurar') expect(r.recorrido.alternativaMostrada).toBe('resguardada')
  })

  it('a las 3 horas: ninguna', () => {
    expect(
      decidirRestauracion({
        storage: guardado(),
        ahora: despues(3 * 60 * 60 * 1000),
        versionDatos: VERSION,
        existeLugar: () => true,
      }),
    ).toEqual({ tipo: 'ninguna' })
  })

  it('otra versión con los lugares existentes: recalcular', () => {
    const r = decidirRestauracion({
      storage: guardado(),
      ahora: () => T0,
      versionDatos: 'nueva00.nueva11',
      existeLugar: (id) => [RECORRIDO.origen, RECORRIDO.destino].includes(id),
    })
    expect(r.tipo).toBe('recalcular')
    if (r.tipo === 'recalcular') {
      expect(r.recorrido.origen).toBe(RECORRIDO.origen)
      expect(r.recorrido.destino).toBe(RECORRIDO.destino)
    }
  })

  it('otra versión con el destino que ya no existe: descartada con aviso y borrada', () => {
    const storage = guardado()
    const r = decidirRestauracion({
      storage,
      ahora: () => T0,
      versionDatos: 'nueva00.nueva11',
      existeLugar: (id) => id === RECORRIDO.origen,
    })
    expect(r).toEqual({ tipo: 'descartada', mensaje: MENSAJE_RECORRIDO_PERDIDO })
    expect(MENSAJE_RECORRIDO_PERDIDO).toBe('No pudimos recuperar tu recorrido anterior')
    expect(storage.getItem(CLAVE_RECORRIDO)).toBeNull()
  })

  it('misma versión pero con un nodo que no existe: recalcular', () => {
    const r = decidirRestauracion({
      storage: guardado(),
      ahora: () => T0,
      versionDatos: VERSION,
      existeLugar: () => true,
      existeNodo: (id) => id !== 'pasillo-d',
    })
    expect(r.tipo).toBe('recalcular')
  })
})

describe('versionDatos', () => {
  it('combina las versiones del grafo y del catálogo', () => {
    expect(versionDatos({ version: '8673d4d' }, { version: '8b8a9e7' })).toBe('8673d4d.8b8a9e7')
    expect(versionDatos({ version: 'otro' }, { version: '8b8a9e7' })).not.toBe(
      versionDatos({ version: '8673d4d' }, { version: '8b8a9e7' }),
    )
  })
})
