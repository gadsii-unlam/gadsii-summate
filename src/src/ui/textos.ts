/**
 * Todos los textos de la interfaz en un solo lugar (español rioplatense, una línea, sin jerga
 * técnica). Los nombres de los lugares NO van acá: salen siempre del catálogo (hallazgo 12).
 */
import type { CategoriaLugar, Piso } from '../datos/index.ts'
import type { Altura } from './hoja/anclaje.ts'

export const TEXTOS = {
  app: '¿Dónde queda?',

  cargando: 'Cargando el plano del campus…',
  errorCarga: 'No pudimos cargar los datos del campus. Revisá la conexión y probá de nuevo.',
  reintentar: 'Reintentar',

  // Barra del inicio
  barraPlaceholder: '¿Desde dónde salís?',
  barraNombre: '¿Desde dónde salís? Elegir punto de partida y destino',
  chipsNombre: 'Lugares de referencia',
  chipEntradas: 'Entradas',

  // Botones flotantes
  ayuda: 'Ayuda',
  recentrar: 'Recentrar el mapa',
  mapa: 'Mapa del campus',
  acercar: 'Acercar',
  alejar: 'Alejar',

  // Hoja inferior
  manija: 'Cambiar altura del panel',
  altura: {
    colapsada: 'Panel abajo',
    media: 'Panel a media altura',
    expandida: 'Panel expandido',
  } satisfies Record<Altura, string>,

  // Inicio
  recientes: 'Recientes',
  referencias: 'Lugares de referencia',
  primerUsoTitulo: 'Para empezar',
  primerUso:
    'Primero elegí desde dónde salís y después a dónde vas. Podés escribir el número del aula (por ejemplo, 121) o el nombre del lugar (Biblioteca).',
  entendido: 'Entendido',

  // Búsqueda
  buscarLugar: 'Buscar lugar',
  elegirPartida: 'Elegir punto de partida',
  tituloOrigen: '¿Desde dónde salís?',
  placeholderDestino: '¿A dónde vas?',
  placeholderOrigen: '¿Desde dónde salís?',
  ejemploBusqueda: 'Por ejemplo: 121, Biblioteca, Lab. de Física',
  borrarTexto: 'Borrar lo escrito',
  volver: 'Volver',
  cerrar: 'Cerrar',
  entradasAlCampus: 'Entradas al campus',
  resultados: (n: number) => (n === 1 ? '1 resultado' : `${n} resultados`),
  sinResultados: (texto: string) => `No encontramos «${texto}»`,
  sinResultadosAnuncio: (texto: string) => `No hay resultados para «${texto}»`,
  sinResultadosSugerencia:
    'Probá con el número del aula (por ejemplo, 121) o con el nombre del lugar.',
  sugerenciaFila: (nombre: string) => `¿Salís de ${nombre}?`,
  ultimoOrigen: 'Último punto de partida',

  // Acceso
  sinAcceso: 'Sin acceso ahora',
  sinAccesoExplicacion: 'Por ahora no se puede entrar: sus accesos están cerrados.',
  sinAccesoInfo: 'Qué significa "Sin acceso ahora"',

  // Ficha
  comoLlegar: 'Cómo llegar',
  puertas: (n: number) => (n === 1 ? 'Tiene 1 puerta' : `Tiene ${n} puertas`),

  // Panel "Cómo llegar"
  origenVacio: '¿Desde dónde salís?',
  elegiOrigen: 'Elegí desde dónde salís',
  destinoVacio: '¿A dónde vas?',
  origenAyuda:
    'No usamos tu ubicación. Elegí una entrada, la Biblioteca o el aula de la que salís.',
  campoOrigen: (nombre: string | null) =>
    nombre ? `Punto de partida: ${nombre}. Cambiar` : 'Punto de partida: ¿Desde dónde salís?',
  campoDestino: (nombre: string | null) =>
    nombre ? `Destino: ${nombre}. Cambiar` : 'Destino: ¿A dónde vas?',
  intercambiar: 'Intercambiar punto de partida y destino',
  intercambiado: (origen: string | null, destino: string | null) =>
    `Ahora salís de ${origen ?? 'un lugar sin elegir'} y vas a ${destino ?? 'un destino sin elegir'}.`,
  borrarOrigen: 'Borrar punto de partida',
  borrarDestino: 'Borrar destino',
  sugerenciaTitulo: (nombre: string) => `¿Salís de ${nombre}?`,
  sugerenciaTexto: 'Es el último punto que usaste.',
  usarOrigen: 'Usar este origen',
  lugaresParaUbicarte: 'Lugares para ubicarte',
  elegiDestino: 'Elegí a dónde vas',
  yaEstas: (nombre: string) =>
    `Ya estás en ${nombre}. Elegí otro destino o cambiá el punto de partida.`,
  buscandoCamino: 'Buscando el camino…',
  rutaPedida: (origen: string, destino: string) => `Camino de ${origen} a ${destino}`,

  // Ayuda
  ayudaTitulo: 'Cómo usar ¿Dónde queda?',
  ayudaPasos: [
    'Elegí desde dónde salís: una entrada, una referencia o el aula donde estás.',
    'Buscá el aula o el lugar al que vas, por número o por nombre.',
    'Seguí la línea azul en el mapa.',
  ],
  leyendaTitulo: 'Qué significa cada símbolo',
  leyendaOrigen: 'Punto de partida',
  leyendaDestino: 'Destino',
  leyendaRuta: 'Camino a seguir',
  ayudaUbicacion: 'La app no usa tu ubicación: vos elegís desde dónde salís.',
  creditoPlano: 'Plano del campus de la UNLaM redibujado por el equipo de ¿Dónde queda?.',
  cerrarAyuda: 'Cerrar la ayuda',
} as const

export const CATEGORIAS: Record<CategoriaLugar, string> = {
  aula: 'Aula',
  laboratorio: 'Laboratorio',
  bano: 'Baño',
  oficina: 'Oficina',
  servicio: 'Servicio',
  auditorio: 'Auditorio',
  entrada: 'Entrada',
}

export const PISOS: Record<Piso, string> = {
  PB: 'Planta baja',
  '1': 'Primer piso',
  '2': 'Segundo piso',
  '3': 'Tercer piso',
}
