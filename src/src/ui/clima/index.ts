// Interfaz del clima simulado (solo para el moderador). Se conecta desde App en una segunda pasada.
export { default as PanelPrueba, type PropsPanelPrueba } from './PanelPrueba.tsx'
export { NOMBRES_ESCENARIO } from './nombres.ts'
export { usePanelPrueba, type PanelPruebaOculto } from './usePanelPrueba.ts'
export {
  DURACION_PULSACION_LARGA_MS,
  usePulsacionLarga,
  type PropsPulsacionLarga,
} from './usePulsacionLarga.ts'
export { default as AvisoClima } from './AvisoClima.tsx'
export {
  ContextoOrquestadorRuta,
  useEstadoRuta,
  useEstadoRutaDe,
  useOrquestadorRuta,
} from './contexto.ts'
export { crearSolicitarRuta } from './solicitarRuta.ts'
