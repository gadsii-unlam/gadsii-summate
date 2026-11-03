/**
 * Reevaluación de la vigencia (decisión 3): en cada cálculo de ruta y cada 60 s para la capa del
 * mapa y los estados "Sin acceso ahora". Sin React: la interfaz se suscribe (por ejemplo con
 * `useSyncExternalStore`) y lee `estado()`, que devuelve la misma referencia mientras el conjunto
 * de cierres vigentes no cambie.
 */
import type { Lugar } from '../datos/index.ts'
import type { GrafoRuteable, TramosExcluidos } from '../rutas/index.ts'
import { lugaresSinAcceso } from './accesibilidad.ts'
import { capaDeCierres, type TramoCerrado } from './capa.ts'
import {
  calcularRutaConCierres,
  type ConsultaConCierres,
  type ResultadoConCierres,
} from './rutas.ts'
import type { Cierre } from './tipos.ts'
import { cierresVigentes, tramosDeCierres } from './vigencia.ts'

export const INTERVALO_REEVALUACION_MS = 60_000

export interface EstadoCierres {
  /** Instante (ms) de la evaluación que produjo este estado. */
  ahora: number
  vigentes: readonly Cierre[]
  excluidos: TramosExcluidos
  /** Ids de los lugares sin acceso ahora. */
  sinAcceso: ReadonlySet<string>
  capa: readonly TramoCerrado[]
}

export interface OpcionesControlador {
  grafo: GrafoRuteable
  /** Todos los cierres cargados (`cargarCierres(...).cierres`). */
  cierres: readonly Cierre[]
  /** Catálogo de lugares, para "Sin acceso ahora". */
  lugares: readonly Pick<Lugar, 'id' | 'puertas'>[]
  /** Reloj (ms). Por defecto `Date.now`; con fecha simulada, `crearReloj(fecha)`. */
  reloj?: () => number
  intervaloMs?: number
}

export interface ControladorCierres {
  /** Último estado evaluado (referencia estable mientras no cambien los vigentes). */
  estado(): EstadoCierres
  /** Reevalúa la vigencia con el reloj; avisa a los suscriptores si cambió. */
  reevaluar(): EstadoCierres
  /** Reevalúa la vigencia y calcula la ruta con los cierres vigentes en este instante. */
  calcularRuta(consulta: ConsultaConCierres): ResultadoConCierres
  /** Se llama al cambiar el conjunto de vigentes. Con al menos un suscriptor corre el intervalo de 60 s. */
  suscribir(oyente: () => void): () => void
  /** Detiene el intervalo y suelta los suscriptores. */
  detener(): void
}

const claveVigentes = (vigentes: readonly Cierre[]) => vigentes.map((c) => c.id).join('\n')

export function crearControladorCierres(opciones: OpcionesControlador): ControladorCierres {
  const { grafo, cierres, lugares } = opciones
  const reloj = opciones.reloj ?? (() => Date.now())
  const intervaloMs = opciones.intervaloMs ?? INTERVALO_REEVALUACION_MS
  const oyentes = new Set<() => void>()
  let intervalo: ReturnType<typeof setInterval> | null = null

  function evaluar(ahora: number): EstadoCierres {
    const vigentes = cierresVigentes(cierres, ahora)
    const excluidos = tramosDeCierres(vigentes)
    return {
      ahora,
      vigentes,
      excluidos,
      sinAcceso: lugaresSinAcceso(grafo, lugares, excluidos),
      capa: capaDeCierres(grafo, vigentes),
    }
  }

  let actual = evaluar(reloj())
  let clave = claveVigentes(actual.vigentes)

  function reevaluar(): EstadoCierres {
    const ahora = reloj()
    const vigentes = cierresVigentes(cierres, ahora)
    const nueva = claveVigentes(vigentes)
    if (nueva !== clave) {
      clave = nueva
      actual = evaluar(ahora)
      for (const o of [...oyentes]) o()
    }
    return actual
  }

  return {
    estado: () => actual,
    reevaluar,
    calcularRuta(consulta) {
      return calcularRutaConCierres(grafo, consulta, reevaluar().vigentes)
    },
    suscribir(oyente) {
      oyentes.add(oyente)
      intervalo ??= setInterval(reevaluar, intervaloMs)
      return () => {
        oyentes.delete(oyente)
        if (oyentes.size === 0 && intervalo !== null) {
          clearInterval(intervalo)
          intervalo = null
        }
      }
    },
    detener() {
      oyentes.clear()
      if (intervalo !== null) clearInterval(intervalo)
      intervalo = null
    },
  }
}

const SIN_EXCLUIDOS: TramosExcluidos = { nodos: new Set(), aristas: new Set() }

/**
 * Tramos excluidos vigentes **en este instante** (reevalúa la vigencia con el reloj del
 * controlador). Sin controlador (todavía cargando), no hay exclusiones.
 */
export function excluidosDeControlador(controlador: ControladorCierres | null): TramosExcluidos {
  return controlador ? controlador.reevaluar().excluidos : SIN_EXCLUIDOS
}
