import { ESCENARIO_POR_DEFECTO, esEscenarioClima, type EscenarioClima } from './tipos.ts'

/** Clave de `sessionStorage` donde se recuerda el escenario durante la sesión de prueba. */
export const CLAVE_ESCENARIO_CLIMA = 'donde-queda:clima'

/** Parámetro de la dirección con el escenario (`?clima=lluvia`). */
export const PARAMETRO_CLIMA = 'clima'

/** Lo mínimo de `Storage` que se usa (para inyectar uno en los tests). */
export type AlmacenSesion = Pick<Storage, 'getItem' | 'setItem'>

function sessionStorageDelNavegador(): AlmacenSesion | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    return null
  }
}

function leerGuardado(almacen: AlmacenSesion | null): EscenarioClima | null {
  try {
    const valor = almacen?.getItem(CLAVE_ESCENARIO_CLIMA) ?? null
    return esEscenarioClima(valor) ? valor : null
  } catch {
    return null
  }
}

function guardar(almacen: AlmacenSesion | null, escenario: EscenarioClima): void {
  try {
    almacen?.setItem(CLAVE_ESCENARIO_CLIMA, escenario)
  } catch {
    // Navegación privada o almacenamiento bloqueado: se recuerda solo en memoria.
  }
}

function deLaDireccion(busqueda: string): EscenarioClima | null {
  const valor = new URLSearchParams(busqueda).get(PARAMETRO_CLIMA)
  return esEscenarioClima(valor) ? valor : null
}

/**
 * Escenario activo al abrir la app. Precedencia: `?clima=` > `sessionStorage` > `seco`.
 * Un valor desconocido en la dirección se ignora. Un valor válido de la dirección se guarda en la
 * sesión, así sobrevive a recargas y a navegaciones que pierdan el parámetro.
 */
export function resolverEscenario(
  busqueda: string,
  almacen: AlmacenSesion | null = sessionStorageDelNavegador(),
): EscenarioClima {
  const desdeDireccion = deLaDireccion(busqueda)
  if (desdeDireccion) {
    guardar(almacen, desdeDireccion)
    return desdeDireccion
  }
  return leerGuardado(almacen) ?? ESCENARIO_POR_DEFECTO
}

/** `?panel=prueba` abre el panel de prueba al iniciar. */
export function pidePanelDePrueba(busqueda: string): boolean {
  return new URLSearchParams(busqueda).get('panel') === 'prueba'
}

export interface ControlEscenario {
  actual(): EscenarioClima
  /** Cambia el escenario, lo guarda en la sesión y avisa a los suscriptores (si cambió). */
  elegir(escenario: EscenarioClima): void
  /** Devuelve la función para desuscribirse. */
  suscribir(alCambiar: (escenario: EscenarioClima) => void): () => void
}

export interface OpcionesControlEscenario {
  /** `location.search` al iniciar. */
  busqueda?: string
  almacen?: AlmacenSesion | null
}

/** Estado del escenario de la sesión, compartido por el servicio de clima y el panel de prueba. */
export function crearControlEscenario(opciones: OpcionesControlEscenario = {}): ControlEscenario {
  const almacen = opciones.almacen === undefined ? sessionStorageDelNavegador() : opciones.almacen
  const busqueda =
    opciones.busqueda ?? (typeof window === 'undefined' ? '' : window.location.search)
  let actual = resolverEscenario(busqueda, almacen)
  const suscriptores = new Set<(e: EscenarioClima) => void>()

  return {
    actual: () => actual,
    elegir(escenario) {
      if (!esEscenarioClima(escenario)) return
      guardar(almacen, escenario)
      if (escenario === actual) return
      actual = escenario
      for (const s of [...suscriptores]) s(escenario)
    },
    suscribir(alCambiar) {
      suscriptores.add(alCambiar)
      return () => suscriptores.delete(alCambiar)
    },
  }
}
