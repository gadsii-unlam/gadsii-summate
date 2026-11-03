// API pública del motor de rutas (lógica pura, sin React). Importar siempre desde acá.
export type {
  AristaRuteable,
  ConsultaRuta,
  Criterio,
  GrafoRuteable,
  MotivoSinRuta,
  NodoRuteable,
  PuntoMapa,
  ResultadoRuta,
  RutaEncontrada,
  TramosExcluidos,
  VecinoRuteable,
} from './tipos.ts'
export { CRITERIOS } from './tipos.ts'
export {
  ErrorGrafoRuteable,
  K_COSTO,
  TOLERANCIA_PESO_PX,
  prepararGrafoRuteable,
  type AristaConPuntos,
  type OpcionesPreparacion,
} from './grafo-ruteable.ts'
export { VELOCIDAD_CAMINATA_M_S, calcularRuta, costoArista, rutaDesdeNodos } from './astar.ts'
export { cargarGrafoRuteable, olvidarGrafoRuteable, type OpcionesCarga } from './carga.ts'
export {
  PASO_REDONDEO_M,
  nombreChip,
  notaRutaUnicaConLluvia,
  redondearDistancia,
  textoAireLibre,
  textoAnuncioRuta,
  textoDistancia,
  textoResumen,
  textoTiempo,
  type NombreChip,
  type NotaRutaUnicaLluvia,
} from './formato.ts'
export {
  VECTORES,
  armarTramos,
  direccionDe,
  indexarNodos,
  partesDeRuta,
  puntosEntre,
  type Direccion,
  type InfoNodo,
  type InfoNodos,
  type PartePolilinea,
  type Tramo,
} from './tramos.ts'
export {
  EDIFICIOS_CORTOS,
  UMBRAL_DESVIO_M,
  UMBRAL_ENSEGUIDA_M,
  calcularGiro,
  etiquetaPiso,
  generarIndicaciones,
  prepararDatosIndicaciones,
  type DatosIndicaciones,
  type Giro,
  type Lado,
  type LugarIndicaciones,
  type LugaresRuta,
  type NombresEntradas,
  type OpcionesDatosIndicaciones,
  type Paso,
  type TipoPaso,
} from './indicaciones.ts'
export { NOMBRES_ENTRADAS } from './entradas.ts'
