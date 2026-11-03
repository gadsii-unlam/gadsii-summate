/**
 * Puntos de integración de la interfaz con los otros cambios (design.md, D12). Cada cambio
 * reemplaza su parte pasando `integraciones` a `<App>` (o a `<Pantalla>`); lo que no se pasa usa
 * el valor por defecto de abajo.
 */
import { createContext, createElement, Fragment, useContext } from 'react'
import type { ComponentType } from 'react'
import type { Caja, Lugar } from '../datos/index.ts'
import type { SolicitarRuta } from './estado/controlador.ts'

export type { PedidoRuta, SolicitarRuta } from './estado/controlador.ts'

/** Estado de acceso de un lugar (lo decide `aplicar-cierres-temporales`). */
export type EstadoAcceso = 'accesible' | 'sin-acceso'

export type EstadoAccesoFn = (lugarId: string) => EstadoAcceso

/** Lo que necesita la capa de avisos flotantes para no tapar la tarjeta ni la hoja. */
export interface PropsAvisos {
  altoVentana: number
  /** Alto visible de la hoja inferior (px desde abajo). */
  altoHoja: number
  /** Borde inferior de la tarjeta de arriba (px desde arriba, con el área segura). */
  bordeTarjeta: number
  escritorio: boolean
}

/** Props del contenido de la hoja en la fase "ruta" y del aviso de clima. */
export interface PropsContenidoRuta {
  origen: Lugar
  destino: Lugar
}

export interface Integraciones {
  /**
   * `calcular-ruta-astar` / `mostrar-ruta-e-indicaciones`: se llama una vez por combinación de
   * origen y destino válidos y distintos (ids de `Lugar`). La `signal` se aborta si la selección
   * cambia, queda incompleta o el usuario sale del panel.
   */
  solicitarRuta: SolicitarRuta
  /** `aplicar-cierres-temporales`: "Sin acceso ahora" en resultados y ficha. */
  estadoAcceso: EstadoAccesoFn
  /** `mostrar-ruta-e-indicaciones`: contenido de la hoja en la fase "ruta". */
  ContenidoRuta: ComponentType<PropsContenidoRuta>
  /** `adaptar-ruta-al-clima`: aviso que va arriba del contenido de la ruta. */
  AvisoClima: ComponentType<PropsContenidoRuta> | null
  /**
   * Capas propias dentro del mapa (se montan dentro de `MapContainer`, pueden usar `useMap()` y
   * los panes `cierres` y `ruta`). En jsdom se montan dentro del doble del mapa.
   */
  CapasMapa: ComponentType | null
  /** Encuadre de la ruta para el botón de recentrar (px del plano), o `null` si no hay ruta. */
  encuadreRuta: (origenId: string, destinoId: string) => Caja | null
  /**
   * `tolerar-senal-irregular`: avisos flotantes ("Sin conexión", versión nueva, cambios de ruta),
   * encima del mapa y arriba de la hoja.
   */
  Avisos: ComponentType<PropsAvisos> | null
  /** `tolerar-senal-irregular`: contenido extra de la ayuda (instalar en el celular). */
  ExtraAyuda: ComponentType | null
  /**
   * `tolerar-senal-irregular`: botón flotante para instalar la app, arriba del de ayuda. La
   * pantalla no lo monta en el primer uso.
   */
  BotonInstalar: ComponentType | null
}

/** Stub de `solicitarRuta`: este cambio no calcula rutas. */
export const solicitarRutaProvisional: SolicitarRuta = () => {}

/**
 * Junta varias capas del mapa en un solo `CapasMapa`. Se montan en el orden dado (el orden visual
 * lo deciden los panes: `cierres` debajo de `ruta`). Los `null` se ignoran; sin capas devuelve
 * `null`. Ejemplo: `CapasMapa: componerCapas(CapaCierresPerezosa, CapaRuta)`.
 */
export function componerCapas(...capas: ReadonlyArray<ComponentType | null>): ComponentType | null {
  const presentes = capas.filter((c): c is ComponentType => c !== null)
  if (presentes.length === 0) return null
  if (presentes.length === 1) return presentes[0]!
  function CapasCompuestas() {
    return createElement(
      Fragment,
      null,
      ...presentes.map((Capa, i) => createElement(Capa, { key: i })),
    )
  }
  return CapasCompuestas
}

export const accesoPorDefecto: EstadoAccesoFn = () => 'accesible'

export const ContextoIntegraciones = createContext<Integraciones | null>(null)

export function useIntegraciones(): Integraciones {
  const valor = useContext(ContextoIntegraciones)
  if (!valor) throw new Error('useIntegraciones fuera de <Pantalla>')
  return valor
}
