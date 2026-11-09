/** Textos de la vista de ruta (los nombres de lugares salen del catálogo; los números, de `src/rutas/formato.ts`). */
export const TEXTOS_RUTA = {
  buscando: 'Buscando el camino…',
  buscandoProgreso: 'Buscando el camino',
  trayecto: (origen: string, destino: string) => `${origen} → ${destino}`,
  iniciar: 'Iniciar',
  finalizar: 'Finalizar viaje',
  alternativas: 'Opciones de ruta',
  recomendadaConLluvia: 'Recomendada con lluvia',
  alAireLibre: 'Al aire libre',
  leyenda: 'Referencias de la ruta',
  bajoTecho: 'Bajo techo',
  origenMapa: (nombre: string) => `Origen: ${nombre}`,
  destinoMapa: (nombre: string) => `Destino: ${nombre}`,
  sentido: 'Sentido de marcha',
} as const

/** Evento de `window` al tocar "Finalizar viaje" (lo escucha `tolerar-senal-irregular`). */
export const EVENTO_FINALIZAR_VIAJE = 'donde-queda:finalizar-viaje'
