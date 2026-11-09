// API pública del clima y la recomendación de ruta (lógica pura, sin React). Importar desde acá.
export type {
  EscenarioClima,
  EstadoClima,
  MotivoClimaNoDisponible,
  ServicioClima,
} from './tipos.ts'
export { ESCENARIOS_CLIMA, ESCENARIO_POR_DEFECTO, esEscenarioClima } from './tipos.ts'
export {
  ESPERA_LENTO_MS,
  TIMEOUT_CLIMA_MS,
  URL_BASE_CLIMA,
  crearServicioClimaSimulado,
  type FetchClima,
  type OpcionesServicioSimulado,
} from './servicio-simulado.ts'
export {
  VIGENCIA_CLIMA_MS,
  conCacheDeClima,
  type OpcionesCacheClima,
  type ServicioClimaConCache,
} from './cache.ts'
export {
  CLAVE_ESCENARIO_CLIMA,
  PARAMETRO_CLIMA,
  crearControlEscenario,
  pidePanelDePrueba,
  resolverEscenario,
  type AlmacenSesion,
  type ControlEscenario,
  type OpcionesControlEscenario,
} from './escenario.ts'
export {
  PREGUNTA_CLIMA_NO_DISPONIBLE,
  TEXTO_CLIMA_NO_DISPONIBLE,
  compararAlternativas,
  etiquetaDe,
  etiquetaResguardada,
  mismaRuta,
  recomendar,
  redondearDecena,
  resumirOpcion,
  textoEstadoClima,
  type ComparacionAlternativas,
  type EstadoClimaPlan,
  type EtiquetaRuta,
  type NotaRutaUnica,
  type PlanDeRuta,
  type ResumenOpcion,
} from './recomendacion.ts'
export { crearMemoriaCriterio, type MemoriaCriterio } from './memoria-criterio.ts'
export {
  crearOrquestadorRuta,
  type CalculoPrevio,
  type ConsultaOrigenDestino,
  type EstadoOrquestador,
  type OpcionesOrquestador,
  type OrquestadorRuta,
  type ProveedorExcluidos,
  type RecorridoRestaurado,
} from './orquestacion.ts'
export { crearClimaDeLaApp, type ClimaDeLaApp } from './app.ts'
