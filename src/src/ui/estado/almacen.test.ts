// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { CLAVES, crearAlmacen, esTexto } from './almacen.ts'

class StorageFalso implements Storage {
  datos = new Map<string, string>()
  get length() {
    return this.datos.size
  }
  clear() {
    this.datos.clear()
  }
  getItem(k: string) {
    return this.datos.get(k) ?? null
  }
  key(i: number) {
    return [...this.datos.keys()][i] ?? null
  }
  removeItem(k: string) {
    this.datos.delete(k)
  }
  setItem(k: string, v: string) {
    this.datos.set(k, v)
  }
}

class StorageQueLanza extends StorageFalso {
  override getItem(): string | null {
    throw new DOMException('bloqueado', 'SecurityError')
  }
  override setItem(): void {
    throw new DOMException('lleno', 'QuotaExceededError')
  }
  override removeItem(): void {
    throw new DOMException('bloqueado', 'SecurityError')
  }
}

describe('almacen', () => {
  it('las claves están versionadas con el prefijo dq:', () => {
    for (const clave of Object.values(CLAVES)) expect(clave).toMatch(/^dq:[a-z-]+:v\d+$/)
  })

  it('escribe y lee JSON', () => {
    const storage = new StorageFalso()
    const almacen = crearAlmacen(storage)
    almacen.escribir(CLAVES.ultimoOrigen, 'servicios-biblioteca')
    expect(storage.getItem(CLAVES.ultimoOrigen)).toBe('"servicios-biblioteca"')
    expect(crearAlmacen(storage).leer(CLAVES.ultimoOrigen, esTexto)).toBe('servicios-biblioteca')
  })

  it('con JSON inválido devuelve null', () => {
    const storage = new StorageFalso()
    storage.setItem(CLAVES.ultimoOrigen, '{roto')
    expect(crearAlmacen(storage).leer(CLAVES.ultimoOrigen, esTexto)).toBeNull()
  })

  it('con un valor de otro tipo devuelve null', () => {
    const storage = new StorageFalso()
    storage.setItem(CLAVES.ultimoOrigen, '42')
    expect(crearAlmacen(storage).leer(CLAVES.ultimoOrigen, esTexto)).toBeNull()
  })

  it('si localStorage lanza excepción no falla y recuerda en memoria', () => {
    const almacen = crearAlmacen(new StorageQueLanza())
    expect(almacen.leer(CLAVES.ultimoOrigen, esTexto)).toBeNull()
    expect(() => almacen.escribir(CLAVES.ultimoOrigen, 'teatro')).not.toThrow()
    expect(almacen.leer(CLAVES.ultimoOrigen, esTexto)).toBe('teatro')
    expect(() => almacen.borrar(CLAVES.ultimoOrigen)).not.toThrow()
    expect(almacen.leer(CLAVES.ultimoOrigen, esTexto)).toBeNull()
  })

  it('sin localStorage funciona en memoria', () => {
    const almacen = crearAlmacen(null)
    almacen.escribir(CLAVES.primerUsoCerrado, true)
    expect(almacen.leer(CLAVES.primerUsoCerrado, (v): v is boolean => v === true)).toBe(true)
  })
})
