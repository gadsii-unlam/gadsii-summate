// Vista de la ruta (mostrar-ruta-e-indicaciones). `CapaRuta` usa Leaflet: se importa aparte
// (`./CapaRuta.tsx`) desde las capas del mapa, para que los tests con el doble no carguen Leaflet.
export { default as ResultadoRuta } from './ResultadoRuta.tsx'
export type { PropsResultadoRuta, SeleccionRuta } from './ResultadoRuta.tsx'
export { default as EsperaRuta } from './EsperaRuta.tsx'
export { default as TarjetaResumen } from './TarjetaResumen.tsx'
export { default as ChipsAlternativas } from './ChipsAlternativas.tsx'
export { default as LeyendaRuta } from './LeyendaRuta.tsx'
export {
  modeloResultado,
  esPlan,
  textoAccesiblePaso,
  type ModeloResultado,
  type OpcionRuta,
} from './modelo.ts'
export {
  cajaDePuntos,
  cajaDeRuta,
  geometriaRuta,
  puntosDePaso,
  type GeometriaRuta,
} from './geometria.ts'
export { DEMORA_ESPERA_MS, MINIMO_ESPERA_MS, useEsperaVisible } from './useEspera.ts'
export * from './estilo.ts'
export { EVENTO_FINALIZAR_VIAJE, TEXTOS_RUTA } from './textos.ts'
