/**
 * Estado compartido entre la hoja de resultado (`ContenidoRutaApp`) y la capa del mapa
 * (`CapaRutaMapa`): qué ruta se ve, cuál es la alternativa, qué paso se tocó y cuándo hay que
 * encuadrar. Lo crea `App`; sin proveedor, las piezas conectadas no hacen nada.
 */
import { createContext, useContext, useSyncExternalStore } from 'react'
import type { PlanDeRuta } from '../../clima/index.ts'
import type { Criterio, DatosIndicaciones, Paso } from '../../rutas/index.ts'
import type { SeleccionRuta } from './ResultadoRuta.tsx'

export interface EstadoVistaRuta {
  /** `origenId|destinoId` de la ruta que se ve. */
  clave: string | null
  /** Plan al que corresponden `criterio` y `seleccion`. */
  plan: PlanDeRuta | null
  /** Criterio elegido con un chip o tocando la línea gris (`null`: el recomendado). */
  criterio: Criterio | null
  seleccion: SeleccionRuta | null
  /** Paso tocado en la lista. */
  paso: Paso | null
  /** Qué encuadrar y una clave que cambia en cada pedido de encuadre. */
  encuadre: { objetivo: 'ruta' | 'paso' | 'inicio'; n: number } | null
}

export interface VistaRuta {
  estado(): EstadoVistaRuta
  suscribir(alCambiar: () => void): () => void
  /** Cambió la ruta que se ve (o dejó de haber, con `null`). Encuadra la ruta nueva. */
  mostrar(clave: string, plan: PlanDeRuta | null, seleccion: SeleccionRuta | null): void
  /** Chip o línea gris. */
  elegir(plan: PlanDeRuta, criterio: Criterio): void
  /** Paso tocado (`null` al volver de la lista o al cambiar de alternativa). */
  tocarPaso(paso: Paso | null): void
  /** "Iniciar": encuadra el comienzo del recorrido, de cerca. */
  iniciar(): void
  /** Se fue de la vista de ruta (solo si `clave` es la que se ve). */
  limpiar(clave?: string): void
}

const VACIO: EstadoVistaRuta = {
  clave: null,
  plan: null,
  criterio: null,
  seleccion: null,
  paso: null,
  encuadre: null,
}

export function crearVistaRuta(): VistaRuta {
  let estado = VACIO
  let n = 0
  const suscriptores = new Set<() => void>()
  const publicar = (nuevo: EstadoVistaRuta) => {
    estado = nuevo
    for (const s of [...suscriptores]) s()
  }
  return {
    estado: () => estado,
    suscribir(alCambiar) {
      suscriptores.add(alCambiar)
      return () => suscriptores.delete(alCambiar)
    },
    mostrar(clave, plan, seleccion) {
      const criterio = estado.plan === plan && estado.clave === clave ? estado.criterio : null
      publicar({
        clave,
        plan,
        criterio,
        seleccion,
        paso: null,
        encuadre: seleccion ? { objetivo: 'ruta', n: ++n } : null,
      })
    },
    elegir(plan, criterio) {
      if (estado.plan !== plan || estado.criterio === criterio) return
      publicar({ ...estado, criterio })
    },
    tocarPaso(paso) {
      publicar({ ...estado, paso, encuadre: paso ? { objetivo: 'paso', n: ++n } : estado.encuadre })
    },
    iniciar() {
      if (!estado.seleccion) return
      publicar({ ...estado, paso: null, encuadre: { objetivo: 'inicio', n: ++n } })
    },
    limpiar(clave) {
      if (clave !== undefined && estado.clave !== clave) return
      if (estado !== VACIO) publicar(VACIO)
    },
  }
}

export const ContextoVistaRuta = createContext<VistaRuta | null>(null)

/** Grafo y nombres para las indicaciones; `null` hasta que carga el grafo. */
export const ContextoDatosIndicaciones = createContext<DatosIndicaciones | null>(null)

export function useVistaRuta(): VistaRuta | null {
  return useContext(ContextoVistaRuta)
}

const sinSuscripcion = () => () => {}
const vacio = () => VACIO

export function useEstadoVistaRuta(): EstadoVistaRuta {
  const vista = useVistaRuta()
  return useSyncExternalStore(
    vista ? vista.suscribir : sinSuscripcion,
    vista ? vista.estado : vacio,
    vista ? vista.estado : vacio,
  )
}

export function useDatosIndicaciones(): DatosIndicaciones | null {
  return useContext(ContextoDatosIndicaciones)
}
