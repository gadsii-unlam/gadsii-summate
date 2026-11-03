import config from '../../datos-fuente/config.json'

/**
 * Metros por px del plano. Es el mismo factor con el que el pipeline calculó `m` en cada arista
 * (y que viaja en `GrafoCampus.metrosPorPx`). Se calibra cambiando `datos-fuente/config.json`.
 */
export const METROS_POR_PX: number = config.metrosPorPx

/** URLs de los datos generados por `npm run datos:build` (servidos desde `public/data/`). */
export const URL_GRAFO = '/data/grafo.json'
export const URL_LUGARES = '/data/lugares.json'
export const URL_PLANO = '/data/plano.json'
