// Componentes de la interfaz de cierres temporales. Se conectan desde App / MapaCampus en una
// segunda pasada. `CapaCierres` no se exporta acá porque carga Leaflet: importarla directo de
// `./CapaCierres.tsx` desde el chunk del mapa (MapaCampus, cargado con React.lazy).
export { default as DetalleCierre, type PropsDetalleCierre } from './DetalleCierre.tsx'
export {
  default as EtiquetaFechaSimulada,
  type PropsEtiquetaFechaSimulada,
} from './EtiquetaFechaSimulada.tsx'
export {
  default as IconoPasoProhibido,
  type PropsIconoPasoProhibido,
} from './IconoPasoProhibido.tsx'
export { DIAMETRO_ICONO, htmlIconoCierre, svgPasoProhibido } from './iconoHtml.ts'
export { useEstadoCierres } from './useEstadoCierres.ts'
export { estadoAccesoDe } from './acceso.ts'
export { ContextoCierres, useControladorCierres, useEstadoCierresActual } from './contexto.ts'
export { default as IconoTramoCerrado } from './IconoTramoCerrado.tsx'
export { SIMBOLOS_CIERRES, TEXTO_LEYENDA_CIERRE } from './leyenda.ts'
