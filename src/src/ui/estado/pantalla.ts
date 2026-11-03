/**
 * Estado de pantalla (design.md de construir-interfaz-movil, D5): la vista activa y la selección
 * de origen y destino, con un reductor puro. El historial del navegador lo maneja el controlador
 * (`controlador.ts`); acá no hay efectos.
 *
 * `EstadoPantalla` es serializable a JSON: `tolerar-senal-irregular` lo guarda y lo restaura.
 */

export type CampoBusqueda = 'destino' | 'origen'

/** Desde dónde se abrió la búsqueda: define qué pasa al elegir un resultado. */
export type OrigenBusqueda = 'inicio' | 'como-llegar'

export type Vista =
  | { tipo: 'inicio' }
  | {
      tipo: 'buscando'
      campo: CampoBusqueda
      desde: OrigenBusqueda
      /** `entradas`: la lista abre con las entradas al campus (chip "Entradas"). */
      filtro?: 'entradas'
    }
  | { tipo: 'ficha'; lugarId: string }
  | { tipo: 'como-llegar' }
  | { tipo: 'ayuda'; sobre: VistaBase }

/** Una vista que no es la ayuda (la ayuda es una capa encima de cualquiera de estas). */
export type VistaBase = Exclude<Vista, { tipo: 'ayuda' }>

export interface Seleccion {
  /** Id de lugar, SOLO si el usuario lo eligió o confirmó. */
  origen: string | null
  destino: string | null
  /** Último origen guardado. Nunca se usa sin confirmar. */
  sugerenciaOrigen: string | null
}

export interface EstadoPantalla {
  vista: Vista
  seleccion: Seleccion
  /** Texto de la búsqueda: sobrevive a ir a la ficha y volver con Atrás. */
  consulta: string
}

export type FaseComoLlegar = 'eligiendo' | 'ruta'

export type EventoPantalla =
  /** Tocar la barra (destino), un campo del panel o el chip "Entradas". */
  | { tipo: 'abrir-busqueda'; campo: CampoBusqueda; filtro?: 'entradas' }
  /** Un chip o un reciente del inicio. */
  | { tipo: 'abrir-ficha'; lugarId: string }
  /** Elegir una fila de la búsqueda. */
  | { tipo: 'elegir-resultado'; lugarId: string }
  /** "Cómo llegar" en la ficha (con destino) o el botón de direcciones de la barra. */
  | { tipo: 'abrir-como-llegar' }
  | { tipo: 'abrir-ayuda' }
  | { tipo: 'escribir'; consulta: string }
  /** Elegir un origen desde la hoja del panel (referencias). */
  | { tipo: 'elegir-origen'; lugarId: string }
  /** Elegir el destino desde la hoja del panel, cuando ya hay origen. */
  | { tipo: 'elegir-destino'; lugarId: string }
  | { tipo: 'confirmar-sugerencia' }
  | { tipo: 'intercambiar' }
  | { tipo: 'borrar-origen' }
  | { tipo: 'borrar-destino' }
  /** `popstate`: la única forma de volver a una vista anterior. */
  | { tipo: 'restaurar'; vista: Vista; consulta?: string }

export const INICIO: VistaBase = { tipo: 'inicio' }

export function estadoInicial(sugerenciaOrigen: string | null = null): EstadoPantalla {
  return {
    vista: INICIO,
    seleccion: { origen: null, destino: null, sugerenciaOrigen },
    consulta: '',
  }
}

/** La fase de "Cómo llegar" es `ruta` solo con origen y destino válidos y distintos. */
export function faseComoLlegar(seleccion: Seleccion): FaseComoLlegar {
  const { origen, destino } = seleccion
  return origen && destino && origen !== destino ? 'ruta' : 'eligiendo'
}

/** La vista sobre la que está la capa de ayuda (o la misma vista). */
export function vistaBase(vista: Vista): VistaBase {
  return vista.tipo === 'ayuda' ? vista.sobre : vista
}

/**
 * `true` mientras el usuario está en el panel "Cómo llegar" o en una capa abierta desde él
 * (la búsqueda de un campo o la ayuda). Ahí vale el pedido automático de la ruta.
 */
export function enComoLlegar(vista: Vista): boolean {
  const base = vistaBase(vista)
  return base.tipo === 'como-llegar' || (base.tipo === 'buscando' && base.desde === 'como-llegar')
}

function conSeleccion(estado: EstadoPantalla, cambios: Partial<Seleccion>): EstadoPantalla {
  return { ...estado, seleccion: { ...estado.seleccion, ...cambios } }
}

function conVista(estado: EstadoPantalla, vista: Vista): EstadoPantalla {
  return { ...estado, vista }
}

/**
 * Reductor puro. Un evento que no corresponde a la vista activa se ignora y devuelve el mismo
 * objeto (así el controlador sabe que no hubo cambio).
 */
export function reducir(estado: EstadoPantalla, evento: EventoPantalla): EstadoPantalla {
  const { vista, seleccion } = estado

  switch (evento.tipo) {
    case 'restaurar':
      return evento.consulta !== undefined && evento.consulta !== estado.consulta
        ? { ...estado, vista: evento.vista, consulta: evento.consulta }
        : conVista(estado, evento.vista)

    case 'abrir-busqueda': {
      if (vista.tipo === 'inicio' && evento.campo === 'destino') {
        return {
          ...estado,
          consulta: '',
          vista: {
            tipo: 'buscando',
            campo: 'destino',
            desde: 'inicio',
            ...(evento.filtro ? { filtro: evento.filtro } : {}),
          },
        }
      }
      if (vista.tipo === 'como-llegar') {
        return {
          ...estado,
          consulta: '',
          vista: { tipo: 'buscando', campo: evento.campo, desde: 'como-llegar' },
        }
      }
      return estado
    }

    case 'abrir-ficha':
      return vista.tipo === 'inicio'
        ? conVista(estado, { tipo: 'ficha', lugarId: evento.lugarId })
        : estado

    case 'elegir-resultado': {
      if (vista.tipo !== 'buscando') return estado
      if (vista.desde === 'inicio') {
        return conVista(estado, { tipo: 'ficha', lugarId: evento.lugarId })
      }
      // Desde "Cómo llegar": se actualiza solo ese campo. La vista vuelve con `popstate`.
      return conSeleccion(
        estado,
        vista.campo === 'origen' ? { origen: evento.lugarId } : { destino: evento.lugarId },
      )
    }

    case 'abrir-como-llegar':
      if (vista.tipo === 'ficha') {
        return {
          ...conSeleccion(estado, { destino: vista.lugarId }),
          vista: { tipo: 'como-llegar' },
        }
      }
      if (vista.tipo === 'inicio') return conVista(estado, { tipo: 'como-llegar' })
      return estado

    case 'abrir-ayuda':
      return vista.tipo === 'ayuda' ? estado : conVista(estado, { tipo: 'ayuda', sobre: vista })

    case 'escribir':
      return vista.tipo === 'buscando' && evento.consulta !== estado.consulta
        ? { ...estado, consulta: evento.consulta }
        : estado

    case 'elegir-origen':
      return vista.tipo === 'como-llegar'
        ? conSeleccion(estado, { origen: evento.lugarId })
        : estado

    case 'elegir-destino':
      return vista.tipo === 'como-llegar'
        ? conSeleccion(estado, { destino: evento.lugarId })
        : estado

    case 'confirmar-sugerencia':
      return vista.tipo === 'como-llegar' && seleccion.sugerenciaOrigen && !seleccion.origen
        ? conSeleccion(estado, { origen: seleccion.sugerenciaOrigen })
        : estado

    case 'intercambiar':
      if (vista.tipo !== 'como-llegar') return estado
      if (!seleccion.origen && !seleccion.destino) return estado
      // El nuevo origen queda confirmado: el usuario lo eligió antes como lugar.
      return conSeleccion(estado, { origen: seleccion.destino, destino: seleccion.origen })

    case 'borrar-origen':
      return vista.tipo === 'como-llegar' && seleccion.origen
        ? conSeleccion(estado, { origen: null })
        : estado

    case 'borrar-destino':
      return vista.tipo === 'como-llegar' && seleccion.destino
        ? conSeleccion(estado, { destino: null })
        : estado
  }
}

// ---------------------------------------------------------------------------------------------
// Hash de cada vista (para el historial y los enlaces directos)
// ---------------------------------------------------------------------------------------------

export function hashDeVista(vista: Vista): string {
  switch (vista.tipo) {
    case 'inicio':
      return ''
    case 'buscando':
      return vista.campo === 'origen' ? '#buscar-origen' : '#buscar'
    case 'ficha':
      return `#lugar/${encodeURIComponent(vista.lugarId)}`
    case 'como-llegar':
      return '#como-llegar'
    case 'ayuda':
      return '#ayuda'
  }
}

/**
 * Vista pedida por un hash en la carga en frío. Un hash desconocido, un lugar que no existe o
 * `#como-llegar` sin selección caen en el inicio. Para la ficha acepta el id del lugar o el id
 * de su puerta (`puerta-aula-121`, `acceso-buffet`).
 */
export function vistaDeHash(hash: string, existeLugar: (id: string) => boolean): Vista {
  const limpio = hash.replace(/^#/, '')
  if (limpio === 'buscar') return { tipo: 'buscando', campo: 'destino', desde: 'inicio' }
  if (limpio === 'ayuda') return { tipo: 'ayuda', sobre: INICIO }
  const lugar = /^lugar\/(.+)$/.exec(limpio)?.[1]
  if (lugar) {
    let id: string
    try {
      id = decodeURIComponent(lugar)
    } catch {
      return INICIO
    }
    if (existeLugar(id)) return { tipo: 'ficha', lugarId: id }
    const sinPuerta = id.replace(/^(puerta|acceso)-/, '')
    if (existeLugar(sinPuerta)) return { tipo: 'ficha', lugarId: sinPuerta }
  }
  return INICIO
}

/** Valida una vista leída de `history.state` o de un estado serializado. */
export function esVista(valor: unknown): valor is Vista {
  if (typeof valor !== 'object' || valor === null) return false
  const v = valor as Record<string, unknown>
  switch (v.tipo) {
    case 'inicio':
    case 'como-llegar':
      return true
    case 'buscando':
      return (
        (v.campo === 'destino' || v.campo === 'origen') &&
        (v.desde === 'inicio' || v.desde === 'como-llegar')
      )
    case 'ficha':
      return typeof v.lugarId === 'string'
    case 'ayuda':
      return esVista(v.sobre) && (v.sobre as Vista).tipo !== 'ayuda'
    default:
      return false
  }
}
