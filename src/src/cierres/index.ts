// API pública de los cierres temporales (lógica pura, sin React). Importar siempre desde acá.
export type {
  ArchivoCierres,
  Cierre,
  CierreArchivo,
  CodigoProblema,
  ProblemaCierres,
  ResultadoValidacion,
} from './tipos.ts'
export { formatearDiaHora, parsearFecha, textoCerradoHasta } from './fechas.ts'
export {
  MOTIVO_POR_DEFECTO,
  indexarGrafo,
  normalizarArista,
  validarCierres,
  type IndiceGrafo,
} from './validar.ts'
export {
  cierresVigentes,
  estaVigente,
  obtenerTramosExcluidos,
  tramosDeCierres,
} from './vigencia.ts'
export {
  TIMEOUT_CIERRES_MS,
  URL_CIERRES,
  cargarCierres,
  type CierresCargados,
  type OpcionesCargaCierres,
} from './carga.ts'
export {
  CLAVE_FECHA_SIMULADA,
  PARAMETRO_FECHA_SIMULADA,
  crearReloj,
  leerFechaSimulada,
  textoFechaSimulada,
  type OpcionesFechaSimulada,
} from './fecha-simulada.ts'
export {
  ENTRADAS_CAMPUS,
  TEXTO_SIN_ACCESO,
  estadoAcceso,
  lugaresSinAcceso,
  nodosAlcanzables,
  type EstadoAcceso,
} from './accesibilidad.ts'
export {
  ACCIONES_SIN_RUTA,
  MAX_MOTIVOS,
  TEXTO_SIN_RUTA,
  avisoDeDesvio,
  calcularRutaConCierres,
  cierresEnRuta,
  explicarSinRuta,
  type AccionSinRuta,
  type AvisoDesvio,
  type CierreResumido,
  type ConsultaConCierres,
  type EstadoSinRuta,
  type ResultadoConCierres,
} from './rutas.ts'
export {
  ESTILO_TRAMO_CERRADO,
  TAMANO_TACTIL_ICONO,
  capaDeCierres,
  detalleDeCierre,
  puntoMedio,
  type DetalleCierre,
  type IconoCierre,
  type TramoCerrado,
} from './capa.ts'
export {
  INTERVALO_REEVALUACION_MS,
  crearControladorCierres,
  excluidosDeControlador,
  type ControladorCierres,
  type EstadoCierres,
  type OpcionesControlador,
} from './controlador.ts'
export { iniciarCierres, type OpcionesInicioCierres } from './arranque.ts'
